//! ADHDer desktop shell.
//!
//! The shell embeds the system WebView2 (via Tauri) and, in release builds,
//! launches the FastAPI backend as a bundled *sidecar* process. During
//! development the backend is started separately (see the README), which keeps
//! the Python debugging experience straightforward.
//!
//! Because a packaged GUI app has no console, the sidecar's output and any
//! startup problems are written to `~/.adhder/desktop.log` so issues are
//! diagnosable.

use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

fn log_file_path() -> Option<PathBuf> {
    let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME"))?;
    let dir = PathBuf::from(home).join(".adhder");
    let _ = create_dir_all(&dir);
    Some(dir.join("desktop.log"))
}

/// Append a timestamp-free line to the desktop log (best-effort).
fn log_line(line: &str) {
    if let Some(path) = log_file_path() {
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(path) {
            let _ = writeln!(f, "{}", line);
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            log_line("[shell] starting up");

            // Only spawn the sidecar when a bundled backend binary is present.
            // In `tauri dev` the developer runs uvicorn themselves.
            match app.shell().sidecar("adhder-backend") {
                Ok(command) => match command.spawn() {
                    Ok((mut rx, _child)) => {
                        log_line("[shell] backend sidecar spawned");
                        tauri::async_runtime::spawn(async move {
                            while let Some(event) = rx.recv().await {
                                match event {
                                    CommandEvent::Stdout(bytes) => {
                                        log_line(&format!(
                                            "[backend] {}",
                                            String::from_utf8_lossy(&bytes).trim_end()
                                        ));
                                    }
                                    CommandEvent::Stderr(bytes) => {
                                        log_line(&format!(
                                            "[backend:err] {}",
                                            String::from_utf8_lossy(&bytes).trim_end()
                                        ));
                                    }
                                    CommandEvent::Error(err) => {
                                        log_line(&format!("[backend:error] {}", err));
                                    }
                                    CommandEvent::Terminated(payload) => {
                                        log_line(&format!(
                                            "[backend] terminated: code={:?} signal={:?}",
                                            payload.code, payload.signal
                                        ));
                                    }
                                    _ => {}
                                }
                            }
                        });
                    }
                    Err(err) => {
                        log_line(&format!("[shell] failed to spawn backend sidecar: {}", err));
                    }
                },
                Err(err) => {
                    // Expected in `tauri dev` (no bundled binary). Logged for clarity.
                    log_line(&format!(
                        "[shell] no backend sidecar found ({}); expecting an externally-run backend",
                        err
                    ));
                }
            }

            let _ = app.get_webview_window("main");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the ADHDer desktop shell");
}
