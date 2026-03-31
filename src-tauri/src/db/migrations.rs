use rusqlite::Connection;

const MIGRATIONS: [(&str, &str); 1] = [("001_init", include_str!("../../migrations/001_init.sql"))];

pub fn apply_migrations(conn: &Connection) -> Result<(), String> {
    let current_version: i64 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|err| format!("failed to read schema version: {err}"))?;

    for (index, (_name, sql)) in MIGRATIONS.iter().enumerate() {
        let target_version = (index as i64) + 1;
        if target_version <= current_version {
            continue;
        }

        conn.execute_batch(sql)
            .map_err(|err| format!("failed to run migration {target_version}: {err}"))?;

        conn.execute_batch(&format!("PRAGMA user_version = {target_version};"))
            .map_err(|err| format!("failed to bump schema version: {err}"))?;
    }

    Ok(())
}
