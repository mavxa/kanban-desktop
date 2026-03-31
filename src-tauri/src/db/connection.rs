use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

pub fn app_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
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

pub fn open_connection(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path)
        .map_err(|err| format!("failed to open sqlite db {}: {err}", path.display()))?;

    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|err| format!("failed to enable foreign keys: {err}"))?;

    Ok(conn)
}
