use rusqlite::{params, Connection, OptionalExtension};

#[derive(Debug, Clone)]
pub struct TaskRow {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ColumnRow {
    pub id: i64,
    pub title: String,
    pub wip_limit: i64,
    pub tasks: Vec<TaskRow>,
}

pub fn get_board_data(conn: &Connection) -> Result<Vec<ColumnRow>, String> {
    let board_id: i64 = conn
        .query_row("SELECT id FROM boards ORDER BY id LIMIT 1", [], |row| {
            row.get(0)
        })
        .map_err(|err| format!("failed to resolve board: {err}"))?;

    let mut columns_stmt = conn
        .prepare(
            "SELECT id, title, wip_limit FROM columns WHERE board_id = ?1 ORDER BY position ASC, id ASC",
        )
        .map_err(|err| format!("failed to prepare columns query: {err}"))?;

    let columns_iter = columns_stmt
        .query_map([board_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })
        .map_err(|err| format!("failed to query columns: {err}"))?;

    let mut result = Vec::new();

    for col in columns_iter {
        let (column_id, title, wip_limit) =
            col.map_err(|err| format!("failed to parse column row: {err}"))?;

        let mut tasks_stmt = conn
            .prepare(
                "SELECT id, title, description, priority FROM tasks WHERE column_id = ?1 ORDER BY position ASC, id ASC",
            )
            .map_err(|err| format!("failed to prepare tasks query: {err}"))?;

        let task_iter = tasks_stmt
            .query_map([column_id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })
            .map_err(|err| format!("failed to query tasks: {err}"))?;

        let mut tasks = Vec::new();

        for task in task_iter {
            let (task_id, task_title, task_description, task_priority) =
                task.map_err(|err| format!("failed to parse task row: {err}"))?;

            let mut tags_stmt = conn
                .prepare(
                    "
                    SELECT t.name
                    FROM task_tags tt
                    INNER JOIN tags t ON t.id = tt.tag_id
                    WHERE tt.task_id = ?1
                    ORDER BY t.name ASC
                    ",
                )
                .map_err(|err| format!("failed to prepare tags query: {err}"))?;

            let tag_iter = tags_stmt
                .query_map([task_id], |row| row.get::<_, String>(0))
                .map_err(|err| format!("failed to query task tags: {err}"))?;

            let mut tags = Vec::new();
            for tag in tag_iter {
                tags.push(tag.map_err(|err| format!("failed to parse tag row: {err}"))?);
            }

            tasks.push(TaskRow {
                id: task_id,
                title: task_title,
                description: task_description,
                priority: task_priority,
                tags,
            });
        }

        result.push(ColumnRow {
            id: column_id,
            title,
            wip_limit,
            tasks,
        });
    }

    Ok(result)
}

pub fn create_task(
    conn: &mut Connection,
    column_id: i64,
    title: String,
    description: Option<String>,
    priority: String,
    tags: Vec<String>,
) -> Result<TaskRow, String> {
    let normalized_title = title.trim().to_string();
    if normalized_title.is_empty() {
        return Err("task title cannot be empty".to_string());
    }

    let normalized_priority = match priority.as_str() {
        "low" | "medium" | "high" => priority,
        _ => return Err("task priority must be low, medium, or high".to_string()),
    };

    let normalized_description = description.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });
    let normalized_tags = normalize_tags(tags);

    let tx = conn
        .transaction()
        .map_err(|err| format!("failed to start transaction: {err}"))?;

    let board_id: i64 = tx
        .query_row(
            "SELECT board_id FROM columns WHERE id = ?1",
            [column_id],
            |row| row.get(0),
        )
        .map_err(|err| format!("failed to resolve target column: {err}"))?;

    let position: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE column_id = ?1",
            [column_id],
            |row| row.get(0),
        )
        .map_err(|err| format!("failed to count tasks in target column: {err}"))?;

    tx.execute(
        "
        INSERT INTO tasks (column_id, title, description, priority, position)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ",
        params![
            column_id,
            normalized_title,
            normalized_description,
            normalized_priority,
            position
        ],
    )
    .map_err(|err| format!("failed to insert task: {err}"))?;

    let task_id = tx.last_insert_rowid();

    for tag_name in &normalized_tags {
        let tag_id = tx
            .query_row(
                "SELECT id FROM tags WHERE board_id = ?1 AND name = ?2 ORDER BY id LIMIT 1",
                params![board_id, tag_name],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|err| format!("failed to resolve tag {tag_name}: {err}"))?;

        let tag_id = match tag_id {
            Some(id) => id,
            None => {
                tx.execute(
                    "INSERT INTO tags (board_id, name) VALUES (?1, ?2)",
                    params![board_id, tag_name],
                )
                .map_err(|err| format!("failed to insert tag {tag_name}: {err}"))?;
                tx.last_insert_rowid()
            }
        };

        tx.execute(
            "INSERT INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
            params![task_id, tag_id],
        )
        .map_err(|err| format!("failed to attach tag {tag_name}: {err}"))?;
    }

    tx.commit()
        .map_err(|err| format!("failed to commit transaction: {err}"))?;

    Ok(TaskRow {
        id: task_id,
        title: normalized_title,
        description: normalized_description,
        priority: normalized_priority,
        tags: normalized_tags,
    })
}

pub fn move_task(
    conn: &mut Connection,
    task_id: i64,
    to_column_id: i64,
    to_position: i64,
) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|err| format!("failed to start transaction: {err}"))?;

    let (from_column_id, from_position): (i64, i64) = tx
        .query_row(
            "SELECT column_id, position FROM tasks WHERE id = ?1",
            [task_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|err| format!("failed to resolve task position: {err}"))?;

    let mut normalized_to_position = if to_position < 0 { 0 } else { to_position };

    tx.execute("UPDATE tasks SET position = -1 WHERE id = ?1", [task_id])
        .map_err(|err| format!("failed to reserve moving task slot: {err}"))?;

    if from_column_id == to_column_id {
        let max_position: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE column_id = ?1 AND id != ?2",
                params![to_column_id, task_id],
                |row| row.get(0),
            )
            .map_err(|err| format!("failed to count tasks in source column: {err}"))?;

        if normalized_to_position > max_position {
            normalized_to_position = max_position;
        }

        if normalized_to_position > from_position {
            tx.execute(
                "
                UPDATE tasks
                SET position = position - 1
                WHERE column_id = ?1
                  AND position > ?2
                  AND position <= ?3
                ",
                params![from_column_id, from_position, normalized_to_position],
            )
            .map_err(|err| format!("failed to shift tasks down in same column: {err}"))?;
        } else if normalized_to_position < from_position {
            tx.execute(
                "
                UPDATE tasks
                SET position = position + 1
                WHERE column_id = ?1
                  AND position >= ?2
                  AND position < ?3
                ",
                params![from_column_id, normalized_to_position, from_position],
            )
            .map_err(|err| format!("failed to shift tasks up in same column: {err}"))?;
        }

        tx.execute(
            "UPDATE tasks SET column_id = ?1, position = ?2 WHERE id = ?3",
            params![to_column_id, normalized_to_position, task_id],
        )
        .map_err(|err| format!("failed to reorder task in same column: {err}"))?;
    } else {
        let max_insert_position: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE column_id = ?1",
                [to_column_id],
                |row| row.get(0),
            )
            .map_err(|err| format!("failed to count tasks in destination column: {err}"))?;

        if normalized_to_position > max_insert_position {
            normalized_to_position = max_insert_position;
        }

        tx.execute(
            "UPDATE tasks SET position = position - 1 WHERE column_id = ?1 AND position > ?2",
            params![from_column_id, from_position],
        )
        .map_err(|err| format!("failed to compact source positions: {err}"))?;

        tx.execute(
            "UPDATE tasks SET position = position + 1 WHERE column_id = ?1 AND position >= ?2",
            params![to_column_id, normalized_to_position],
        )
        .map_err(|err| format!("failed to expand destination positions: {err}"))?;

        tx.execute(
            "UPDATE tasks SET column_id = ?1, position = ?2 WHERE id = ?3",
            params![to_column_id, normalized_to_position, task_id],
        )
        .map_err(|err| format!("failed to move task: {err}"))?;
    }

    normalize_column_positions(&tx, from_column_id)?;
    if from_column_id != to_column_id {
        normalize_column_positions(&tx, to_column_id)?;
    }

    tx.execute(
        "INSERT INTO task_history (task_id, from_column_id, to_column_id) VALUES (?1, ?2, ?3)",
        params![task_id, from_column_id, to_column_id],
    )
    .map_err(|err| format!("failed to write task history: {err}"))?;

    tx.commit()
        .map_err(|err| format!("failed to commit transaction: {err}"))?;

    Ok(())
}

fn normalize_column_positions(
    tx: &rusqlite::Transaction<'_>,
    column_id: i64,
) -> Result<(), String> {
    tx.execute(
        "
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC, id ASC) - 1 AS next_position
          FROM tasks
          WHERE column_id = ?1
        )
        UPDATE tasks
        SET position = (SELECT next_position FROM ranked WHERE ranked.id = tasks.id)
        WHERE column_id = ?1
        ",
        [column_id],
    )
    .map_err(|err| format!("failed to normalize column positions for {column_id}: {err}"))?;

    Ok(())
}

fn normalize_tags(tags: Vec<String>) -> Vec<String> {
    let mut normalized_tags = Vec::new();

    for tag in tags {
        let name = tag.trim().trim_start_matches('#').to_lowercase();
        if name.is_empty() || normalized_tags.contains(&name) {
            continue;
        }

        normalized_tags.push(name);
    }

    normalized_tags
}

pub fn update_task(
    conn: &mut Connection,
    task_id: i64,
    title: String,
    description: Option<String>,
    priority: String,
    tags: Vec<String>,
) -> Result<TaskRow, String> {
    let normalized_title = title.trim().to_string();
    if normalized_title.is_empty() {
        return Err("task title cannot be empty".to_string());
    }

    let normalized_priority = match priority.as_str() {
        "low" | "medium" | "high" => priority,
        _ => return Err("task priority must be low, medium, or high".to_string()),
    };

    let normalized_description = description.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });
    let normalized_tags = normalize_tags(tags);

    let tx = conn
        .transaction()
        .map_err(|err| format!("failed to start transaction: {err}"))?;

    let board_id: i64 = tx
        .query_row(
            "SELECT c.board_id FROM tasks t JOIN columns c ON c.id = t.column_id WHERE t.id = ?1",
            [task_id],
            |row| row.get(0),
        )
        .map_err(|err| format!("failed to resolve task board: {err}"))?;

    tx.execute(
        "UPDATE tasks SET title = ?1, description = ?2, priority = ?3 WHERE id = ?4",
        params![
            normalized_title,
            normalized_description,
            normalized_priority,
            task_id
        ],
    )
    .map_err(|err| format!("failed to update task: {err}"))?;

    // Replace tags: remove old, insert new
    tx.execute("DELETE FROM task_tags WHERE task_id = ?1", [task_id])
        .map_err(|err| format!("failed to clear task tags: {err}"))?;

    for tag_name in &normalized_tags {
        let tag_id = tx
            .query_row(
                "SELECT id FROM tags WHERE board_id = ?1 AND name = ?2 ORDER BY id LIMIT 1",
                params![board_id, tag_name],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|err| format!("failed to resolve tag {tag_name}: {err}"))?;

        let tag_id = match tag_id {
            Some(id) => id,
            None => {
                tx.execute(
                    "INSERT INTO tags (board_id, name) VALUES (?1, ?2)",
                    params![board_id, tag_name],
                )
                .map_err(|err| format!("failed to insert tag {tag_name}: {err}"))?;
                tx.last_insert_rowid()
            }
        };

        tx.execute(
            "INSERT INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
            params![task_id, tag_id],
        )
        .map_err(|err| format!("failed to attach tag {tag_name}: {err}"))?;
    }

    tx.commit()
        .map_err(|err| format!("failed to commit transaction: {err}"))?;

    Ok(TaskRow {
        id: task_id,
        title: normalized_title,
        description: normalized_description,
        priority: normalized_priority,
        tags: normalized_tags,
    })
}

pub fn delete_task(conn: &mut Connection, task_id: i64) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|err| format!("failed to start transaction: {err}"))?;

    let (column_id, position): (i64, i64) = tx
        .query_row(
            "SELECT column_id, position FROM tasks WHERE id = ?1",
            [task_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|err| format!("failed to resolve task: {err}"))?;

    tx.execute("DELETE FROM task_tags WHERE task_id = ?1", [task_id])
        .map_err(|err| format!("failed to delete task tags: {err}"))?;

    tx.execute("DELETE FROM task_history WHERE task_id = ?1", [task_id])
        .map_err(|err| format!("failed to delete task history: {err}"))?;

    tx.execute("DELETE FROM tasks WHERE id = ?1", [task_id])
        .map_err(|err| format!("failed to delete task: {err}"))?;

    // Compact positions in the column
    tx.execute(
        "UPDATE tasks SET position = position - 1 WHERE column_id = ?1 AND position > ?2",
        params![column_id, position],
    )
    .map_err(|err| format!("failed to compact positions: {err}"))?;

    normalize_column_positions(&tx, column_id)?;

    tx.commit()
        .map_err(|err| format!("failed to commit transaction: {err}"))?;

    Ok(())
}

pub fn create_column(
    conn: &mut Connection,
    title: String,
    wip_limit: i64,
) -> Result<ColumnRow, String> {
    let normalized_title = title.trim().to_string();
    if normalized_title.is_empty() {
        return Err("column title cannot be empty".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|err| format!("failed to start transaction: {err}"))?;

    let board_id: i64 = tx
        .query_row("SELECT id FROM boards ORDER BY id LIMIT 1", [], |row| {
            row.get(0)
        })
        .map_err(|err| format!("failed to resolve board: {err}"))?;

    let position: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM columns WHERE board_id = ?1",
            [board_id],
            |row| row.get(0),
        )
        .map_err(|err| format!("failed to count columns: {err}"))?;

    tx.execute(
        "INSERT INTO columns (board_id, title, wip_limit, position) VALUES (?1, ?2, ?3, ?4)",
        params![board_id, normalized_title, wip_limit.max(0), position],
    )
    .map_err(|err| format!("failed to insert column: {err}"))?;

    let column_id = tx.last_insert_rowid();

    tx.commit()
        .map_err(|err| format!("failed to commit transaction: {err}"))?;

    Ok(ColumnRow {
        id: column_id,
        title: normalized_title,
        wip_limit: wip_limit.max(0),
        tasks: Vec::new(),
    })
}

pub fn update_column(
    conn: &mut Connection,
    column_id: i64,
    title: String,
    wip_limit: i64,
) -> Result<(), String> {
    let normalized_title = title.trim().to_string();
    if normalized_title.is_empty() {
        return Err("column title cannot be empty".to_string());
    }

    conn.execute(
        "UPDATE columns SET title = ?1, wip_limit = ?2 WHERE id = ?3",
        params![normalized_title, wip_limit.max(0), column_id],
    )
    .map_err(|err| format!("failed to update column: {err}"))?;

    Ok(())
}

pub fn delete_column(conn: &mut Connection, column_id: i64) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|err| format!("failed to start transaction: {err}"))?;

    // Get all task IDs in this column to clean up related data
    let task_ids: Vec<i64> = {
        let mut stmt = tx
            .prepare("SELECT id FROM tasks WHERE column_id = ?1")
            .map_err(|err| format!("failed to prepare task query: {err}"))?;
        let rows = stmt
            .query_map([column_id], |row| row.get::<_, i64>(0))
            .map_err(|err| format!("failed to query tasks: {err}"))?;
        let mut ids = Vec::new();
        for row in rows {
            ids.push(row.map_err(|err| format!("failed to read task id: {err}"))?);
        }
        ids
    };

    // Delete task_tags and task_history for all tasks in this column
    for task_id in &task_ids {
        tx.execute("DELETE FROM task_tags WHERE task_id = ?1", [task_id])
            .map_err(|err| format!("failed to delete task tags: {err}"))?;
        tx.execute("DELETE FROM task_history WHERE task_id = ?1", [task_id])
            .map_err(|err| format!("failed to delete task history: {err}"))?;
    }

    // Delete all tasks in the column
    tx.execute("DELETE FROM tasks WHERE column_id = ?1", [column_id])
        .map_err(|err| format!("failed to delete column tasks: {err}"))?;

    // Get column position for reordering
    let position: i64 = tx
        .query_row(
            "SELECT position FROM columns WHERE id = ?1",
            [column_id],
            |row| row.get(0),
        )
        .map_err(|err| format!("failed to get column position: {err}"))?;

    let board_id: i64 = tx
        .query_row(
            "SELECT board_id FROM columns WHERE id = ?1",
            [column_id],
            |row| row.get(0),
        )
        .map_err(|err| format!("failed to get column board: {err}"))?;

    // Delete the column
    tx.execute("DELETE FROM columns WHERE id = ?1", [column_id])
        .map_err(|err| format!("failed to delete column: {err}"))?;

    // Compact remaining column positions
    tx.execute(
        "UPDATE columns SET position = position - 1 WHERE board_id = ?1 AND position > ?2",
        params![board_id, position],
    )
    .map_err(|err| format!("failed to compact column positions: {err}"))?;

    tx.commit()
        .map_err(|err| format!("failed to commit transaction: {err}"))?;

    Ok(())
}
