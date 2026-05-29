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

fn task_row_to_dto(task: db::repo::TaskRow) -> TaskDto {
    TaskDto {
        id: task.id.to_string(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        tags: task.tags,
    }
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
            tasks: column.tasks.into_iter().map(task_row_to_dto).collect(),
        })
        .collect())
}

#[tauri::command]
fn create_task(
    app: tauri::AppHandle,
    column_id: i64,
    title: String,
    description: Option<String>,
    priority: String,
    tags: Vec<String>,
) -> Result<TaskDto, String> {
    let mut conn = db::connect_with_bootstrap(&app)?;
    db::repo::create_task(&mut conn, column_id, title, description, priority, tags)
        .map(task_row_to_dto)
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

#[tauri::command]
fn update_task(
    app: tauri::AppHandle,
    task_id: i64,
    title: String,
    description: Option<String>,
    priority: String,
    tags: Vec<String>,
) -> Result<TaskDto, String> {
    let mut conn = db::connect_with_bootstrap(&app)?;
    db::repo::update_task(&mut conn, task_id, title, description, priority, tags)
        .map(task_row_to_dto)
}

#[tauri::command]
fn delete_task(app: tauri::AppHandle, task_id: i64) -> Result<(), String> {
    let mut conn = db::connect_with_bootstrap(&app)?;
    db::repo::delete_task(&mut conn, task_id)
}

#[tauri::command]
fn create_column(
    app: tauri::AppHandle,
    title: String,
    wip_limit: i64,
) -> Result<ColumnDto, String> {
    let mut conn = db::connect_with_bootstrap(&app)?;
    let row = db::repo::create_column(&mut conn, title, wip_limit)?;
    Ok(ColumnDto {
        id: row.id,
        title: row.title,
        wip_limit: row.wip_limit,
        tasks: Vec::new(),
    })
}

#[tauri::command]
fn update_column(
    app: tauri::AppHandle,
    column_id: i64,
    title: String,
    wip_limit: i64,
) -> Result<(), String> {
    let mut conn = db::connect_with_bootstrap(&app)?;
    db::repo::update_column(&mut conn, column_id, title, wip_limit)
}

#[tauri::command]
fn delete_column(app: tauri::AppHandle, column_id: i64) -> Result<(), String> {
    let mut conn = db::connect_with_bootstrap(&app)?;
    db::repo::delete_column(&mut conn, column_id)
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
        .invoke_handler(tauri::generate_handler![
            get_board_data,
            create_task,
            update_task,
            delete_task,
            create_column,
            update_column,
            delete_column,
            move_task
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
