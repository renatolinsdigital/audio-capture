use crate::audio::AudioState;
use crate::config::{AppConfig, ConfigDir};
use serde::{Deserialize, Serialize};
use slug::slugify;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingMeta {
    pub name: String,
    pub slug: String,
    pub duration_secs: f64,
    pub created_at: String,
    pub file_size: u64,
}

fn get_metadata_path(output_dir: &Path) -> PathBuf {
    output_dir.join("recordings.json")
}

fn load_metadata(output_dir: &Path) -> Vec<RecordingMeta> {
    let path = get_metadata_path(output_dir);
    if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    }
}

fn save_metadata(output_dir: &Path, metadata: &[RecordingMeta]) {
    let path = get_metadata_path(output_dir);
    let content = serde_json::to_string_pretty(metadata).unwrap_or_default();
    std::fs::write(path, content).ok();
}

fn unique_slug(base_slug: &str, output_dir: &Path) -> String {
    let mut slug = base_slug.to_string();
    let mut counter = 1;
    while output_dir.join(format!("{}.wav", slug)).exists() {
        slug = format!("{}-{}", base_slug, counter);
        counter += 1;
    }
    slug
}

#[tauri::command]
pub fn start_recording(state: State<'_, AudioState>, gain_db: f32) -> Result<(), String> {
    state.start_recording(gain_db)
}

#[tauri::command]
pub fn get_audio_quality(state: State<'_, AudioState>) -> (u16, String) {
    state.get_quality()
}

#[tauri::command]
pub fn set_audio_quality(
    state: State<'_, AudioState>,
    config_dir: State<'_, ConfigDir>,
    bit_depth: u16,
    channels: String,
) -> Result<(), String> {
    state.set_quality(bit_depth, &channels);
    AppConfig::save_audio_quality(&config_dir.0, bit_depth, &channels);
    Ok(())
}

#[tauri::command]
pub fn pause_recording(state: State<'_, AudioState>) -> Result<(), String> {
    state.pause()
}

#[tauri::command]
pub fn resume_recording(state: State<'_, AudioState>) -> Result<(), String> {
    state.resume()
}

#[tauri::command]
pub fn stop_recording(state: State<'_, AudioState>) -> Result<f64, String> {
    state.stop()
}

#[tauri::command]
pub fn save_recording(state: State<'_, AudioState>, name: String) -> Result<RecordingMeta, String> {
    let temp_path = state
        .get_current_file()
        .ok_or_else(|| "No recording to save".to_string())?;

    if !temp_path.exists() {
        return Err("Temporary recording file not found".to_string());
    }

    let base_slug = slugify(&name);
    let slug = unique_slug(&base_slug, &state.output_dir());
    let final_path = state.output_dir().join(format!("{}.wav", slug));

    std::fs::rename(&temp_path, &final_path)
        .map_err(|e| format!("Failed to rename file: {}", e))?;

    let file_size = std::fs::metadata(&final_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let duration_secs = state.get_duration();
    let created_at = chrono::Utc::now().to_rfc3339();

    let meta = RecordingMeta {
        name: name.clone(),
        slug: slug.clone(),
        duration_secs,
        created_at,
        file_size,
    };

    let mut metadata = load_metadata(&state.output_dir());
    metadata.push(meta.clone());
    save_metadata(&state.output_dir(), &metadata);

    Ok(meta)
}

#[tauri::command]
pub fn list_recordings(state: State<'_, AudioState>) -> Result<Vec<RecordingMeta>, String> {
    let mut metadata = load_metadata(&state.output_dir());

    // Filter out entries whose files no longer exist
    metadata.retain(|m| state.output_dir().join(format!("{}.wav", m.slug)).exists());
    save_metadata(&state.output_dir(), &metadata);

    // Sort by creation date (newest first)
    metadata.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(metadata)
}

#[tauri::command]
pub fn rename_recording(
    state: State<'_, AudioState>,
    old_slug: String,
    new_name: String,
) -> Result<RecordingMeta, String> {
    let old_path = state.output_dir().join(format!("{}.wav", old_slug));
    if !old_path.exists() {
        return Err("Recording file not found".to_string());
    }

    let new_base_slug = slugify(&new_name);
    let new_slug = if new_base_slug == old_slug {
        old_slug.clone()
    } else {
        unique_slug(&new_base_slug, &state.output_dir())
    };

    let new_path = state.output_dir().join(format!("{}.wav", new_slug));

    if new_slug != old_slug {
        std::fs::rename(&old_path, &new_path)
            .map_err(|e| format!("Failed to rename file: {}", e))?;
    }

    let mut metadata = load_metadata(&state.output_dir());
    if let Some(entry) = metadata.iter_mut().find(|m| m.slug == old_slug) {
        entry.name = new_name;
        entry.slug = new_slug.clone();
    }
    save_metadata(&state.output_dir(), &metadata);

    let meta = metadata
        .into_iter()
        .find(|m| m.slug == new_slug)
        .ok_or_else(|| "Metadata entry not found".to_string())?;

    Ok(meta)
}

#[tauri::command]
pub fn delete_recording(state: State<'_, AudioState>, slug: String) -> Result<(), String> {
    let file_path = state.output_dir().join(format!("{}.wav", slug));
    if file_path.exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    let mut metadata = load_metadata(&state.output_dir());
    metadata.retain(|m| m.slug != slug);
    save_metadata(&state.output_dir(), &metadata);

    Ok(())
}

#[tauri::command]
pub fn get_recording_path(state: State<'_, AudioState>, slug: String) -> Result<String, String> {
    let file_path = state.output_dir().join(format!("{}.wav", slug));
    if !file_path.exists() {
        return Err("Recording file not found".to_string());
    }
    file_path
        .canonicalize()
        .map(|p| {
            let s = p.to_string_lossy().to_string();
            // Windows canonicalize() adds a \\?\ UNC prefix that breaks convertFileSrc
            s.strip_prefix(r"\\?\").unwrap_or(&s).to_string()
        })
        .map_err(|e| format!("Failed to resolve path: {}", e))
}

#[tauri::command]
pub fn get_output_dir(state: State<'_, AudioState>) -> String {
    state.output_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub fn set_output_dir(
    state: State<'_, AudioState>,
    config_dir: State<'_, ConfigDir>,
    path: String,
) -> Result<(), String> {
    let new_dir = PathBuf::from(&path);
    std::fs::create_dir_all(&new_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    state.set_output_dir(new_dir);
    AppConfig::save_output_dir(&config_dir.0, &path);
    Ok(())
}

#[tauri::command]
pub fn open_output_dir(state: State<'_, AudioState>) -> Result<(), String> {
    let dir = state.output_dir();
    std::process::Command::new("explorer")
        .arg(dir)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn pick_output_dir() -> Result<Option<String>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Select output folder for recordings")
        .pick_folder();
    Ok(picked.map(|p| p.to_string_lossy().to_string()))
}
