use serde::Deserialize;
use std::path::{Path, PathBuf};

/// Tauri-managed state: the directory that contains audio-capture.toml.
pub struct ConfigDir(pub PathBuf);

#[derive(Default, Debug, Deserialize)]
pub struct AppConfig {
    /// User-configured output directory (absolute path).
    /// When absent defaults to the system Desktop.
    #[serde(default)]
    pub output_dir: Option<String>,
}

impl AppConfig {
    pub fn load(base_dir: &Path) -> Self {
        let path = base_dir.join("audio-capture.toml");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| toml::from_str::<AppConfig>(&s).ok())
            .unwrap_or_default()
    }

    pub fn save_output_dir(config_dir: &Path, output_dir: &str) {
        let path = config_dir.join("audio-capture.toml");
        let current_toml = std::fs::read_to_string(&path).unwrap_or_default();
        let mut doc: toml::Table =
            toml::from_str(&current_toml).unwrap_or_else(|_| toml::Table::new());
        doc.insert(
            "output_dir".to_string(),
            toml::Value::String(output_dir.to_string()),
        );
        let _ = std::fs::write(&path, toml::to_string_pretty(&doc).unwrap_or_default());
    }
}
