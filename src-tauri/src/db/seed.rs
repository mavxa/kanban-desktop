use rusqlite::{params, Connection, OptionalExtension};

pub fn seed_if_empty(conn: &Connection) -> Result<(), String> {
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
