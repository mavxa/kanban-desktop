mod db;

use serde::Serialize;

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

#[tauri::command]
fn get_board_data(app: tauri::AppHandle) -> Result<Vec<ColumnDto>, String> {
    let conn = db::connect_with_bootstrap(&app)?;
    let rows = db::repo::get_board_data(&conn)?;

    Ok(rows
        .into_iter()
        .map(|column| ColumnDto {
            id: column.id,
            title: column.title,
            wip_limit: column.wip_limit,
            tasks: column
                .tasks
                .into_iter()
                .map(|task| TaskDto {
                    id: task.id.to_string(),
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    tags: task.tags,
                })
                .collect(),
        })
        .collect())
}

#[tauri::command]
fn move_task(
    app: tauri::AppHandle,
    task_id: i64,
    to_column_id: i64,
    to_position: i64,
) -> Result<(), String> {
    let mut conn = db::connect_with_bootstrap(&app)?;
    db::repo::move_task(&mut conn, task_id, to_column_id, to_position)
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

            let _ = db::connect_with_bootstrap(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_board_data, move_task])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
