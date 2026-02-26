# Running the Project

---

## The only runnable artifact is the `.exe`

There is **no web version** of this app. The browser tab that appears at `http://localhost:1420` during development is a Vite dev server for UI work only — the moment any component loads, it calls `invoke()` to talk to Rust, which throws an error in the browser. Opening `localhost:1420` in a browser will show a broken UI.

**The app only works as the desktop `.exe`**, either launched directly or via an installer.

---

## Architecture

```
┌──────────────────────────────┐     IPC (invoke)     ┌───────────────────────────────┐
│  Frontend — React + Vite     │ ◄──────────────────► │  Backend — Rust + Tauri       │
│  src/                        │                       │  src-tauri/src/               │
│                              │                       │                               │
│  UI, state, user interaction │                       │  WASAPI loopback capture      │
│  useRecorder/useRecordings   │                       │  WAV encoding (hound)         │
│  AudioPlayer, RecordingList  │                       │  File I/O, metadata           │
└──────────────────────────────┘                       └───────────────────────────────┘
```

The frontend calls Rust via `invoke()` from `@tauri-apps/api/core`. There is no HTTP API — the IPC channel only exists inside the Tauri WebView. Audio playback uses the Tauri asset protocol (`asset://`) to serve local files to the `<audio>` element.

---

## Commands

### Active development — `tauri-dev.bat dev`

```bash
tauri-dev.bat dev          # CMD / PowerShell
cmd //c tauri-dev.bat dev  # Git Bash
```

- Starts the Vite dev server and compiles a debug Rust binary
- Opens the desktop window — **this is the app**
- Both sides hot-reload: save a `.tsx` file → instant HMR; save a `.rs` file → Cargo recompiles and reloads (~5s)
- Recordings → Desktop (user-configurable)

The browser tab at `http://localhost:1420` also appears. Ignore it unless you're doing pure CSS/layout work on a component that doesn't call `invoke()`.

---

### Build once, run many times — `npm run build:dev` + `npm run start`

Use this when you don't need hot-reload and want to launch instantly without Vite or Cargo running.

```bash
npm run build:dev   # build once (or after code changes)
npm run start       # launch any time after, no compilation
```

`npm run start` aborts with a clear error if a dev build isn't present:
```
  Error: dev build not found.
  Run this first:  npm run build:dev
```

- Recordings → Desktop by default (user-configurable in the app)
- Config → `audio-capture.toml` in `<project root>/` — stores the chosen output folder
- Switching between `build:dev` and `build:prod` always forces a full Rust recompile (different feature set)

---

### Production / distribution — `npm run build:prod`

```bash
npm run build:prod
```

Produces a self-contained installer. `npm run start` will refuse to run this binary.

- Recordings → Desktop by default (user-configurable in the app)
- Config → `audio-capture.toml` in `%LOCALAPPDATA%\com.audiocapture.app\` (created automatically on first run)
- Installers written to `src-tauri/target/release/bundle/`:
  ```
  msi\Audio Capture_0.1.0_x64_en-US.msi
  nsis\Audio Capture_0.1.0_x64-setup.exe
  ```

---

## Output folder

By default recordings land on the **Desktop**. The app lets you pick any folder and remembers the choice across restarts.

| Command | Default recording location | Config file |
|---|---|---|
| `tauri-dev.bat dev` | Desktop | `<project root>/audio-capture.toml` |
| `npm run build:dev` → `npm run start` | Desktop | `<project root>/audio-capture.toml` |
| `npm run build:prod` → installer | Desktop | `%LOCALAPPDATA%\com.audiocapture.app\audio-capture.toml` |

The chosen folder is stored as `output_dir` in `audio-capture.toml` and takes effect immediately. The folder also contains `recordings.json` — a metadata index maintained by the Rust backend.

### Changing the output folder in the app

When the app is idle (not recording), the controls panel shows an **OUTPUT FOLDER** section with:
- the current folder path
- a 📁 button — opens the folder in Windows Explorer
- a `…` button — opens a folder-picker dialog to select a new location

Switching folders does not move existing recordings. Each folder has its own independent `recordings.json` index.

---

## Recording quality

The controls panel exposes a **QUALITY** section when the app is idle. Changes take effect immediately for the next recording and are persisted automatically to `audio-capture.toml`.

### Bit depth

| Setting | Format | Size impact | When to use |
|---|---|---|---|
| **16-bit** (default) | PCM integer | Half the size of 32-bit | General use, voice, meetings, podcasts |
| **32-bit** | IEEE float | ~22 MB/min at 48 kHz stereo | Music production, post-processing, archival |

The WASAPI loopback always captures 32-bit float internally. When 16-bit is selected the app converts `f32 → i16` inline (`sample × 32767`, clamped) before writing to disk — no audible quality difference for typical listening.

### Channels

| Setting | Channels written | Size impact | When to use |
|---|---|---|---|
| **Stereo** (default) | 2 (L + R) | Full size | Music, gaming, anything with spatial audio |
| **Mono** | 1 (L+R averaged) | Half the stereo size | Voice, meetings, narration |

### Estimated sizes at 48 kHz

| Bit depth | Channels | ~MB per minute |
|---|---|---|
| 16-bit | Stereo | 11 MB |
| 16-bit | Mono | 5.5 MB |
| 32-bit | Stereo | 22 MB |
| 32-bit | Mono | 11 MB |

The hint bar at the bottom of the QUALITY section shows the current estimate and a one-line description. Hovering any option button shows a full tooltip explaining its impact.

---

## Configuration

The file `audio-capture.toml` stores the app’s preferences. It is created automatically on the first run.

All settings are written automatically by the app when you change them via the UI. You can also edit the file manually while the app is closed:

```toml
# audio-capture.toml

# Absolute path to the folder where recordings are saved.
# Leave unset to use the Desktop (default).
# output_dir = "C:\\Users\\you\\Music\\Recordings"

# WAV bit depth: 16 (PCM, default — smaller files) or 32 (float — maximum precision).
# bit_depth = 16

# Channel mode: "stereo" (default) or "mono" (halves file size — ideal for voice).
# channels = "stereo"
```

**Gain** is not stored in this file. The baseline is always system-level unity (0 dB). Use the in-app **GAIN** slider (−6 to +6 dB) before each recording to adjust.
