use hound::{SampleFormat, WavSpec, WavWriter};
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

pub const STATE_IDLE: u8 = 0;
pub const STATE_RECORDING: u8 = 1;
pub const STATE_PAUSED: u8 = 2;

pub struct AudioState {
    state: Arc<AtomicU8>,
    capture_thread: Mutex<Option<JoinHandle<Result<(), String>>>>,
    output_dir: Mutex<PathBuf>,
    current_file: Mutex<Option<PathBuf>>,
    samples_written: Arc<Mutex<u64>>,
    sample_rate: Arc<Mutex<u32>>,
    channels: Arc<Mutex<u16>>,
}

impl AudioState {
    pub fn new(output_dir: PathBuf) -> Self {
        Self {
            state: Arc::new(AtomicU8::new(STATE_IDLE)),
            capture_thread: Mutex::new(None),
            output_dir: Mutex::new(output_dir),
            current_file: Mutex::new(None),
            samples_written: Arc::new(Mutex::new(0)),
            sample_rate: Arc::new(Mutex::new(48000)),
            channels: Arc::new(Mutex::new(2)),
        }
    }

    pub fn output_dir(&self) -> PathBuf {
        self.output_dir.lock().unwrap().clone()
    }

    pub fn set_output_dir(&self, path: PathBuf) {
        *self.output_dir.lock().unwrap() = path;
    }

    pub fn start_recording(&self, gain_db: f32) -> Result<(), String> {
        let current = self.state.load(Ordering::SeqCst);
        if current != STATE_IDLE {
            return Err("Already recording".to_string());
        }

        let temp_path = self.output_dir().join("_temp_recording.wav");
        *self.current_file.lock().unwrap() = Some(temp_path.clone());
        *self.samples_written.lock().unwrap() = 0;

        self.state.store(STATE_RECORDING, Ordering::SeqCst);

        let state = self.state.clone();
        let samples_written = self.samples_written.clone();
        let sample_rate = self.sample_rate.clone();
        let channels = self.channels.clone();
        // Convert the UI gain slider (dB) to a linear multiplier.
        let config_gain = 10_f32.powf(gain_db / 20.0);

        let handle = thread::spawn(move || {
            capture_loopback(temp_path, state, samples_written, sample_rate, channels, config_gain)
        });

        *self.capture_thread.lock().unwrap() = Some(handle);
        Ok(())
    }

    pub fn pause(&self) -> Result<(), String> {
        let current = self.state.load(Ordering::SeqCst);
        if current != STATE_RECORDING {
            return Err("Not currently recording".to_string());
        }
        self.state.store(STATE_PAUSED, Ordering::SeqCst);
        Ok(())
    }

    pub fn resume(&self) -> Result<(), String> {
        let current = self.state.load(Ordering::SeqCst);
        if current != STATE_PAUSED {
            return Err("Not currently paused".to_string());
        }
        self.state.store(STATE_RECORDING, Ordering::SeqCst);
        Ok(())
    }

    pub fn stop(&self) -> Result<f64, String> {
        let current = self.state.load(Ordering::SeqCst);
        if current != STATE_RECORDING && current != STATE_PAUSED {
            return Err("Not recording".to_string());
        }

        // Signal stop
        self.state.store(STATE_IDLE, Ordering::SeqCst);

        // Wait for capture thread to finish
        if let Some(handle) = self.capture_thread.lock().unwrap().take() {
            match handle.join() {
                Ok(Ok(())) => {}
                Ok(Err(e)) => eprintln!("Capture thread error: {}", e),
                Err(_) => eprintln!("Capture thread panicked"),
            }
        }

        // Calculate duration
        let samples = *self.samples_written.lock().unwrap();
        let sr = *self.sample_rate.lock().unwrap() as u64;
        let ch = *self.channels.lock().unwrap() as u64;
        let duration = if sr > 0 && ch > 0 {
            samples as f64 / (sr * ch) as f64
        } else {
            0.0
        };

        Ok(duration)
    }

    pub fn get_current_file(&self) -> Option<PathBuf> {
        self.current_file.lock().unwrap().clone()
    }

    pub fn get_duration(&self) -> f64 {
        let samples = *self.samples_written.lock().unwrap();
        let sr = *self.sample_rate.lock().unwrap() as u64;
        let ch = *self.channels.lock().unwrap() as u64;
        if sr > 0 && ch > 0 {
            samples as f64 / (sr * ch) as f64
        } else {
            0.0
        }
    }
}

#[cfg(target_os = "windows")]
fn capture_loopback(
    output_path: PathBuf,
    state: Arc<AtomicU8>,
    samples_written: Arc<Mutex<u64>>,
    sample_rate_out: Arc<Mutex<u32>>,
    channels_out: Arc<Mutex<u16>>,
    config_gain: f32,
) -> Result<(), String> {
    use std::ptr;
    use windows::Win32::Media::Audio::*;
    use windows::Win32::System::Com::*;

    unsafe {
        // Initialize COM for this thread
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() {
            return Err(format!("COM init failed: {:?}", hr));
        }

        // Get the default audio render device (speakers/headphones)
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create device enumerator: {}", e))?;

        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| format!("Failed to get default audio endpoint: {}", e))?;

        // Activate IAudioClient
        let audio_client: IAudioClient = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Failed to activate IAudioClient: {}", e))?;

        // Get the mix format (native audio format)
        let format_ptr = audio_client
            .GetMixFormat()
            .map_err(|e| format!("Failed to get mix format: {}", e))?;

        let format = &*format_ptr;
        let n_channels = format.nChannels;
        let sample_rate = format.nSamplesPerSec;
        let bits_per_sample = format.wBitsPerSample;

        // Store format info
        *sample_rate_out.lock().unwrap() = sample_rate;
        *channels_out.lock().unwrap() = n_channels;

        // Initialize audio client in LOOPBACK mode
        // Buffer duration: 1 second (in 100-nanosecond units)
        let buffer_duration: i64 = 10_000_000;
        audio_client
            .Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK,
                buffer_duration,
                0,
                format_ptr,
                None,
            )
            .map_err(|e| format!("Failed to initialize audio client: {}", e))?;

        // Get capture client
        let capture_client: IAudioCaptureClient = audio_client
            .GetService()
            .map_err(|e| format!("Failed to get capture client: {}", e))?;

        // Create WAV writer
        // WASAPI shared mode always outputs IEEE float 32-bit
        let wav_bits = if bits_per_sample == 32 { 32 } else { 16 };
        let wav_format = if bits_per_sample == 32 {
            SampleFormat::Float
        } else {
            SampleFormat::Int
        };

        let spec = WavSpec {
            channels: n_channels,
            sample_rate,
            bits_per_sample: wav_bits,
            sample_format: wav_format,
        };

        let file = std::fs::File::create(&output_path)
            .map_err(|e| format!("Failed to create WAV file: {}", e))?;
        let buf_writer = BufWriter::new(file);
        let mut writer = WavWriter::new(buf_writer, spec)
            .map_err(|e| format!("Failed to create WAV writer: {}", e))?;

        // Start capturing
        audio_client
            .Start()
            .map_err(|e| format!("Failed to start audio client: {}", e))?;

        // Capture loop
        loop {
            let current_state = state.load(Ordering::SeqCst);
            if current_state == STATE_IDLE {
                break;
            }

            // Sleep briefly to avoid spinning
            std::thread::sleep(std::time::Duration::from_millis(10));

            // Get available packets
            let mut packet_size = capture_client
                .GetNextPacketSize()
                .map_err(|e| format!("GetNextPacketSize failed: {}", e))?;

            while packet_size > 0 {
                let mut buffer: *mut u8 = ptr::null_mut();
                let mut num_frames = 0u32;
                let mut flags = 0u32;

                capture_client
                    .GetBuffer(
                        &mut buffer,
                        &mut num_frames,
                        &mut flags,
                        None,
                        None,
                    )
                    .map_err(|e| format!("GetBuffer failed: {}", e))?;

                let is_recording = state.load(Ordering::SeqCst) == STATE_RECORDING;

                if is_recording && num_frames > 0 {
                    let total_samples = (num_frames as usize) * (n_channels as usize);
                    let is_silent = flags & 0x2 != 0; // AUDCLNT_BUFFERFLAGS_SILENT

                    if wav_format == SampleFormat::Float {
                        if is_silent {
                            for _ in 0..total_samples {
                                writer
                                    .write_sample(0.0f32)
                                    .map_err(|e| format!("Write failed: {}", e))?;
                            }
                        } else {
                            let data = std::slice::from_raw_parts(
                                buffer as *const f32,
                                total_samples,
                            );
                            for &sample in data {
                                writer
                                    .write_sample((sample * config_gain).clamp(-1.0, 1.0))
                                    .map_err(|e| format!("Write failed: {}", e))?;
                            }
                        }
                    } else {
                        // 16-bit PCM fallback
                        if is_silent {
                            for _ in 0..total_samples {
                                writer
                                    .write_sample(0i16)
                                    .map_err(|e| format!("Write failed: {}", e))?;
                            }
                        } else {
                            let data = std::slice::from_raw_parts(
                                buffer as *const i16,
                                total_samples,
                            );
                            for &sample in data {
                                writer
                                    .write_sample(sample)
                                    .map_err(|e| format!("Write failed: {}", e))?;
                            }
                        }
                    }

                    *samples_written.lock().unwrap() += total_samples as u64;
                }

                capture_client
                    .ReleaseBuffer(num_frames)
                    .map_err(|e| format!("ReleaseBuffer failed: {}", e))?;

                packet_size = capture_client
                    .GetNextPacketSize()
                    .map_err(|e| format!("GetNextPacketSize failed: {}", e))?;
            }
        }

        // Stop and finalize
        audio_client
            .Stop()
            .map_err(|e| format!("Failed to stop audio client: {}", e))?;

        writer
            .finalize()
            .map_err(|e| format!("Failed to finalize WAV: {}", e))?;

        CoUninitialize();
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn capture_loopback(
    _output_path: PathBuf,
    _state: Arc<AtomicU8>,
    _samples_written: Arc<Mutex<u64>>,
    _sample_rate_out: Arc<Mutex<u32>>,
    _channels_out: Arc<Mutex<u16>>,
    _config_gain: f32,
) -> Result<(), String> {
    Err("System audio capture is only supported on Windows".to_string())
}
