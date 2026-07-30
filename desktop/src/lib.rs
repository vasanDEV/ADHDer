//! ADHDer desktop shell.
//!
//! The shell embeds the system WebView2 (via Tauri) and, in release builds,
//! launches the FastAPI backend as a bundled *sidecar* process. During
//! development the backend is started separately (see the README), which keeps
//! the Python debugging experience straightforward.

use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Only spawn the sidecar when a bundled backend binary is present.
            // In `tauri dev` the developer runs uvicorn themselves.
            if let Ok(command) = app.shell().sidecar("adhder-backend") {
                let (mut rx, _child) = command
                    .spawn()
                    .expect("failed to spawn the ADHDer backend sidecar");

                // Drain sidecar output so the pipe never blocks; forward to logs.
                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                println!("[backend] {}", String::from_utf8_lossy(&line));
                            }
                            CommandEvent::Stderr(line) => {
                                eprintln!("[backend] {}", String::from_utf8_lossy(&line));
                            }
                            _ => {}
                        }
                    }
                });
            }

            let _ = app.get_webview_window("main");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the ADHDer desktop shell");
}
