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
        "INSERT INTO boards (id, title, description) VALUES (1, 'My Board', 'Local kanban board')",
        [],
    )
    .map_err(|err| format!("failed to insert board seed: {err}"))?;

    let default_columns = [
        (1_i64, "Backlog", 0_i64, 0_i64),
        (2_i64, "To Do", 1_i64, 5_i64),
        (3_i64, "In Progress", 2_i64, 3_i64),
        (4_i64, "Review", 3_i64, 2_i64),
        (5_i64, "Done", 4_i64, 0_i64),
    ];

    for (id, title, position, wip_limit) in default_columns {
        conn.execute(
            "INSERT INTO columns (id, board_id, title, position, wip_limit) VALUES (?1, 1, ?2, ?3, ?4)",
            params![id, title, position, wip_limit],
        )
        .map_err(|err| format!("failed to insert column seed: {err}"))?;
    }

    Ok(())
}
