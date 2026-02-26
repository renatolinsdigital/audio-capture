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
- Recordings → `<project root>/output/`

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

- Recordings → `<project root>/output/` — path baked into the binary at compile time via the `dev-paths` Cargo feature
- Switching between `build:dev` and `build:prod` always forces a full Rust recompile (different feature set)

---

### Production / distribution — `npm run build:prod`

```bash
npm run build:prod
```

Produces a self-contained installer. `npm run start` will refuse to run this binary.

- Recordings → `output/` next to wherever the `.exe` is installed
- Installers written to `src-tauri/target/release/bundle/`:
  ```
  msi\Audio Capture_0.1.0_x64_en-US.msi
  nsis\Audio Capture_0.1.0_x64-setup.exe
  ```

---

## Output folder

| Command | Recordings go to |
|---|---|
| `tauri-dev.bat dev` | `<project root>/output/` |
| `npm run build:dev` → `npm run start` | `<project root>/output/` |
| `npm run build:prod` → installer | `output/` next to the `.exe` |

The folder also contains `recordings.json` — a metadata index maintained by the Rust backend.

---

## Build times

The **first** build compiles ~450 Rust crates from scratch (1–3 min). After that, Cargo is incremental:

- No Rust changes → `Finished in ~0.5s`, no recompile
- Your files changed → only those files recompile (~2–10s)
- Switched `build:dev` ↔ `build:prod` → full recompile (feature set changed)

Don't delete `src-tauri/target/` — it's gitignored for size but losing it means starting over. Use `cargo clean` only if the cache is corrupted.
