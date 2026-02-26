#![deny(unused)]
#![warn(clippy::all)]

mod audio;
mod commands;

use audio::AudioState;
use commands::*;
use std::path::PathBuf;

pub fn run() {
    // dev-paths feature (set by `npm run build:dev`):
    //   Bakes CARGO_MANIFEST_DIR into the binary at compile time so recordings
    //   always land in <project root>/output/, no matter where the exe is run from.
    //
    // debug_assertions (set by `tauri dev`):
    //   Same behaviour — the dev server binary is always run from the project context.
    //
    // Neither (production build via `npm run build:prod`):
    //   Resolves output/ relative to the exe's own directory so recordings land
    //   next to the installed binary, wherever it lives.
    let output_dir = if cfg!(any(debug_assertions, feature = "dev-paths")) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("Could not find project root")
            .join("output")
    } else {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("output")))
            .unwrap_or_else(|| PathBuf::from("output"))
    };

    std::fs::create_dir_all(&output_dir).ok();

    tauri::Builder::default()
        .manage(AudioState::new(output_dir))
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
