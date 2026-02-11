#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

mod commands;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(commands::ImageCache {
                thumbnails: Mutex::new(HashMap::new()),
                converted: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_directory_images,
            commands::read_image_file,
            commands::read_image_thumbnail,
            commands::save_screenshot,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                // macOS gives file URLs like file:///path/to/image.jpg
                let paths: Vec<String> = urls
                    .into_iter()
                    .filter_map(|u| {
                        if u.scheme() == "file" {
                            u.to_file_path()
                                .ok()
                                .map(|p| p.to_string_lossy().to_string())
                        } else {
                            None
                        }
                    })
                    .collect();

                if !paths.is_empty() {
                    let _ = app.emit("open-files", paths);
                }
            }
        });
}
