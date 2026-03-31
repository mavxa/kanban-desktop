pub mod connection;
pub mod migrations;
pub mod repo;
pub mod seed;

use rusqlite::Connection;

pub fn connect_with_bootstrap(app: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = connection::app_db_path(app)?;
    let conn = connection::open_connection(&db_path)?;
    migrations::apply_migrations(&conn)?;
    seed::seed_if_empty(&conn)?;
    Ok(conn)
}
