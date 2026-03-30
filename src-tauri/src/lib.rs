use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TaskDto {
    id: String,
    title: String,
    description: Option<String>,
    priority: String,
    tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ColumnDto {
    id: i64,
    title: String,
    wip_limit: i64,
    tasks: Vec<TaskDto>,
}

fn app_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("failed to resolve app data dir: {err}"))?;

    fs::create_dir_all(&app_data_dir).map_err(|err| {
        format!(
            "failed to create app data dir {}: {err}",
            app_data_dir.display()
        )
    })?;

    Ok(app_data_dir.join("kanban.sqlite3"))
}

fn open_connection(path: &PathBuf) -> Result<Connection, String> {
    Connection::open(path)
        .map_err(|err| format!("failed to open sqlite db {}: {err}", path.display()))
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS columns (
      id INTEGER PRIMARY KEY,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      wip_limit INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      column_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      position INTEGER NOT NULL,
      FOREIGN KEY (column_id) REFERENCES columns (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY,
      board_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3f3f46',
      FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      id INTEGER PRIMARY KEY,
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_history (
      id INTEGER PRIMARY KEY,
      task_id INTEGER NOT NULL,
      from_column_id INTEGER,
      to_column_id INTEGER NOT NULL,
      moved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      FOREIGN KEY (from_column_id) REFERENCES columns (id),
      FOREIGN KEY (to_column_id) REFERENCES columns (id)
    );
    ",
    )
    .map_err(|err| format!("failed to initialize schema: {err}"))
}

fn seed_if_empty(conn: &Connection) -> Result<(), String> {
    let board_exists: Option<i64> = conn
        .query_row("SELECT id FROM boards LIMIT 1", [], |row| row.get(0))
        .optional()
        .map_err(|err| format!("failed to check existing board: {err}"))?;

    if board_exists.is_some() {
        return Ok(());
    }

    conn.execute(
    "INSERT INTO boards (id, title, description) VALUES (1, 'Project Alpha', 'Local-first desktop board')",
    [],
  )
  .map_err(|err| format!("failed to insert board seed: {err}"))?;

    let seed_columns = [
        (1_i64, "Backlog", 0_i64, 0_i64),
        (2_i64, "To Do", 1_i64, 5_i64),
        (3_i64, "In Progress", 2_i64, 3_i64),
        (4_i64, "Review", 3_i64, 2_i64),
        (5_i64, "Done", 4_i64, 0_i64),
    ];

    for (id, title, position, wip_limit) in seed_columns {
        conn.execute(
      "INSERT INTO columns (id, board_id, title, position, wip_limit) VALUES (?1, 1, ?2, ?3, ?4)",
      params![id, title, position, wip_limit],
    )
    .map_err(|err| format!("failed to insert column seed: {err}"))?;
    }

    let seed_tags = [
        (1_i64, "frontend", "#3b82f6"),
        (2_i64, "backend", "#8b5cf6"),
        (3_i64, "database", "#06b6d4"),
        (4_i64, "devops", "#f97316"),
        (5_i64, "ui", "#ec4899"),
        (6_i64, "research", "#6b7280"),
        (7_i64, "setup", "#10b981"),
        (8_i64, "desktop", "#14b8a6"),
        (9_i64, "tauri", "#f59e0b"),
    ];

    for (id, name, color) in seed_tags {
        conn.execute(
            "INSERT INTO tags (id, board_id, name, color) VALUES (?1, 1, ?2, ?3)",
            params![id, name, color],
        )
        .map_err(|err| format!("failed to insert tag seed: {err}"))?;
    }

    let seed_tasks = [
        (
            1_i64,
            1_i64,
            "Research drag-and-drop libraries",
            Some("Compare @dnd-kit vs alternatives"),
            "low",
            0_i64,
        ),
        (
            2_i64,
            1_i64,
            "Design SQLite schema",
            Some("Boards, columns, tasks, tags, history"),
            "high",
            1_i64,
        ),
        (
            3_i64,
            2_i64,
            "Setup Tauri commands",
            Some("Expose board loading and task movement"),
            "medium",
            0_i64,
        ),
        (
            4_i64,
            3_i64,
            "Port web kanban design",
            Some("Bring old web visuals to desktop"),
            "high",
            0_i64,
        ),
        (
            5_i64,
            5_i64,
            "Initialize Tauri + React app",
            Some("Bootstrap desktop shell"),
            "medium",
            0_i64,
        ),
    ];

    for (id, column_id, title, description, priority, position) in seed_tasks {
        conn.execute(
      "INSERT INTO tasks (id, column_id, title, description, priority, position) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      params![id, column_id, title, description, priority, position],
    )
    .map_err(|err| format!("failed to insert task seed: {err}"))?;
    }

    let seed_task_tags = [
        (1_i64, 6_i64),
        (2_i64, 2_i64),
        (2_i64, 3_i64),
        (3_i64, 8_i64),
        (3_i64, 9_i64),
        (4_i64, 1_i64),
        (4_i64, 5_i64),
        (5_i64, 7_i64),
    ];

    for (task_id, tag_id) in seed_task_tags {
        conn.execute(
            "INSERT INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
            params![task_id, tag_id],
        )
        .map_err(|err| format!("failed to insert task tag seed: {err}"))?;
    }

    Ok(())
}

fn bootstrap_db(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = app_db_path(app)?;
    let conn = open_connection(&path)?;
    init_schema(&conn)?;
    seed_if_empty(&conn)?;
    Ok(path)
}

#[tauri::command]
fn get_board_data(app: tauri::AppHandle) -> Result<Vec<ColumnDto>, String> {
    let path = bootstrap_db(&app)?;
    let conn = open_connection(&path)?;

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

        let mut task_rows = Vec::new();

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

            task_rows.push(TaskDto {
                id: task_id.to_string(),
                title: task_title,
                description: task_description,
                priority: task_priority,
                tags,
            });
        }

        result.push(ColumnDto {
            id: column_id,
            title,
            wip_limit,
            tasks: task_rows,
        });
    }

    Ok(result)
}

#[tauri::command]
fn move_task(
    app: tauri::AppHandle,
    task_id: i64,
    to_column_id: i64,
    to_position: i64,
) -> Result<(), String> {
    let path = bootstrap_db(&app)?;
    let mut conn = open_connection(&path)?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let _ = bootstrap_db(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_board_data, move_task])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
