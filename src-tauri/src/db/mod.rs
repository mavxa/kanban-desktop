pub mod connection;
pub mod migrations;
pub mod repo;
pub mod seed;

use rusqlite::{Connection, OptionalExtension};

pub fn connect_with_bootstrap(app: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = connection::app_db_path(app)?;
    let conn = connection::open_connection(&db_path)?;
    migrations::apply_migrations(&conn)?;
    ensure_board_exists(&conn)?;
    Ok(conn)
}

/// Ensures at least one board row exists so the app can function.
/// Does NOT create any columns or tasks — user creates everything themselves.
fn ensure_board_exists(conn: &Connection) -> Result<(), String> {
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
    .map_err(|err| format!("failed to create initial board: {err}"))?;

    Ok(())
}
