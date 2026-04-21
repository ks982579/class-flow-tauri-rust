use platform::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            platform::new_workspace,
            platform::load_workspace,
            platform::save_workspace,
            platform::get_workspace,
            platform::add_namespace,
            platform::remove_namespace,
            platform::rename_namespace,
            platform::add_class,
            platform::remove_class,
            platform::replace_class,
            platform::add_property,
            platform::remove_property,
            platform::add_method,
            platform::remove_method,
            platform::add_workflow,
            platform::remove_workflow,
            platform::rename_workflow,
            platform::add_step,
            platform::remove_step,
            platform::connect_steps,
            platform::disconnect_steps,
            platform::connect_methods,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
