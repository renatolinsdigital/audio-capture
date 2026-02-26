use serde::Deserialize;
use std::path::{Path, PathBuf};

/// Tauri-managed state: the directory that contains audio-capture.toml.
pub struct ConfigDir(pub PathBuf);

fn default_bit_depth() -> u16 {
    16
}

fn default_channels() -> String {
    "stereo".to_string()
}

#[derive(Debug, Deserialize)]
pub struct AppConfig {
    /// User-configured output directory (absolute path).
    /// When absent defaults to the system Desktop.
    #[serde(default)]
    pub output_dir: Option<String>,

    /// Bit depth for WAV output: 16 (PCM, half the size) or 32 (float, maximum precision).
    #[serde(default = "default_bit_depth")]
    pub bit_depth: u16,

    /// Channel mode: "stereo" or "mono" (mono halves file size again; ideal for voice).
    #[serde(default = "default_channels")]
    pub channels: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            output_dir: None,
            bit_depth: default_bit_depth(),
            channels: default_channels(),
        }
    }
}

impl AppConfig {
    pub fn load(base_dir: &Path) -> Self {
        let path = base_dir.join("audio-capture.toml");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| toml::from_str::<AppConfig>(&s).ok())
            .unwrap_or_default()
    }

    fn patch_toml(config_dir: &Path, key: &str, value: toml::Value) {
        let path = config_dir.join("audio-capture.toml");
        let current_toml = std::fs::read_to_string(&path).unwrap_or_default();
        let mut doc: toml::Table =
            toml::from_str(&current_toml).unwrap_or_else(|_| toml::Table::new());
        doc.insert(key.to_string(), value);
        let _ = std::fs::write(&path, toml::to_string_pretty(&doc).unwrap_or_default());
    }

    pub fn save_output_dir(config_dir: &Path, output_dir: &str) {
        Self::patch_toml(
            config_dir,
            "output_dir",
            toml::Value::String(output_dir.to_string()),
        );
    }

    pub fn save_audio_quality(config_dir: &Path, bit_depth: u16, channels: &str) {
        let path = config_dir.join("audio-capture.toml");
        let current_toml = std::fs::read_to_string(&path).unwrap_or_default();
        let mut doc: toml::Table =
            toml::from_str(&current_toml).unwrap_or_else(|_| toml::Table::new());
        doc.insert(
            "bit_depth".to_string(),
            toml::Value::Integer(bit_depth as i64),
        );
        doc.insert(
            "channels".to_string(),
            toml::Value::String(channels.to_string()),
        );
        let _ = std::fs::write(&path, toml::to_string_pretty(&doc).unwrap_or_default());
    }
}
