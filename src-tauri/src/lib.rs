#![deny(unused)]
#![warn(clippy::all)]

mod audio;
mod commands;
mod config;

use audio::AudioState;
use commands::*;
use config::{AppConfig, ConfigDir};
use std::path::PathBuf;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Determine the config base directory (where audio-capture.toml lives).
            // For dev builds this is the project root; for production it's AppLocalData.
            let config_base_dir = if cfg!(any(debug_assertions, feature = "dev-paths")) {
                PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .parent()
                    .expect("Could not find project root")
                    .to_path_buf()
            } else {
                app.path()
                    .app_local_data_dir()
                    .unwrap_or_else(|_| {
                        std::env::current_exe()
                            .ok()
                            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                            .unwrap_or_else(|| PathBuf::from("."))
                    })
            };

            std::fs::create_dir_all(&config_base_dir).ok();

            let config = AppConfig::load(&config_base_dir);

            // Determine output directory:
            //   1. User-configured value in audio-capture.toml  (persisted choice)
            //   2. System Desktop (default for fresh installs)
            let output_dir = config
                .output_dir
                .as_deref()
                .map(PathBuf::from)
                .filter(|p: &PathBuf| p.is_absolute())
                .unwrap_or_else(|| {
                    app.path()
                        .desktop_dir()
                        .or_else(|_| app.path().home_dir().map(|h| h.join("Desktop")))
                        .unwrap_or_else(|_| PathBuf::from("."))
                });

            std::fs::create_dir_all(&output_dir).ok();

            app.manage(AudioState::new(output_dir));
            app.manage(ConfigDir(config_base_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            pause_recording,
            resume_recording,
            stop_recording,
            save_recording,
            list_recordings,
            rename_recording,
            delete_recording,
            get_recording_path,
            get_output_dir,
            set_output_dir,
            open_output_dir,
            pick_output_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
