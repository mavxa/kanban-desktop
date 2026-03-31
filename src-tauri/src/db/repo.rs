use rusqlite::{params, Connection};

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
            "SELECT id, title, wip_limit FROM columns WHERE board_id = ?1 ORDER BY position ASC",
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
                "SELECT id, title, description, priority FROM tasks WHERE column_id = ?1 ORDER BY position ASC",
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

    tx.execute(
        "UPDATE tasks SET position = position - 1 WHERE column_id = ?1 AND position > ?2",
        params![from_column_id, from_position],
    )
    .map_err(|err| format!("failed to compact source positions: {err}"))?;

    tx.execute(
        "UPDATE tasks SET position = position + 1 WHERE column_id = ?1 AND position >= ?2",
        params![to_column_id, to_position],
    )
    .map_err(|err| format!("failed to expand destination positions: {err}"))?;

    tx.execute(
        "UPDATE tasks SET column_id = ?1, position = ?2 WHERE id = ?3",
        params![to_column_id, to_position, task_id],
    )
    .map_err(|err| format!("failed to move task: {err}"))?;

    tx.execute(
        "INSERT INTO task_history (task_id, from_column_id, to_column_id) VALUES (?1, ?2, ?3)",
        params![task_id, from_column_id, to_column_id],
    )
    .map_err(|err| format!("failed to write task history: {err}"))?;

    tx.commit()
        .map_err(|err| format!("failed to commit transaction: {err}"))?;

    Ok(())
}
