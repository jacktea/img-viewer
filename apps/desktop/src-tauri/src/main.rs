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
        .register_uri_scheme_protocol("img", |app, request| {
            let url = request.uri().path();
            // path from URL might start with / (e.g. img://localhost/Users/...) -> /Users/...
            // Standard URL decoding
            let path = urlencoding::decode(url)
                .map(|p| p.into_owned())
                .unwrap_or_else(|_| url.to_string());

            // Handle potential leading slash issue if needed, but usually uri().path() is absolute path like /C:/... or /Users/...
            // On Windows, might need to strip leading slash if it looks like /C:/
            #[cfg(target_os = "windows")]
            let path = if path.starts_with('/') {
                &path[1..]
            } else {
                &path
            };

            let file_path = std::path::Path::new(&*path);

            // Security check: ensure file exists and is a file
            if !file_path.exists() || !file_path.is_file() {
                return tauri::http::Response::builder()
                    .status(404)
                    .body(Vec::new())
                    .unwrap();
            }

            // Read file
            let content = match std::fs::read(file_path) {
                Ok(data) => data,
                Err(_) => {
                    return tauri::http::Response::builder()
                        .status(500)
                        .body(Vec::new())
                        .unwrap();
                }
            };

            // Guess Mime
            let mime_type = mime_guess::from_path(file_path).first_or_octet_stream();

            tauri::http::Response::builder()
                .header("Content-Type", mime_type.as_ref())
                .header("Access-Control-Allow-Origin", "*") // Allow frontend access
                .body(content)
                .unwrap()
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
