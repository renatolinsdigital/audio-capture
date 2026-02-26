# Audio Capture

A Tauri desktop app for capturing system audio on Windows. Records any sound playing on your PC — videos, music, browser, etc. — and saves it as a WAV file with lossless quality.

## Main Stack

- **TypeScript** — Type-safe JavaScript for the frontend
- **Rust** — Backend audio capture and file I/O
- **Tauri 2** — Lightweight desktop framework bridging React and Rust via IPC
- **React 18** — UI library
- **Vite 6** — Frontend build tooling and dev server
- **SASS/SCSS** — Modular component-level styling with shared theme tokens

## Tools & Libraries

- **WASAPI** — Windows Audio Session API for loopback capture (`windows` crate)
- **hound** — WAV encoding
- **chrono** — Date/time handling for recordings
- **slug** — Filename-safe string generation
- **serde / serde_json** — Serialization between Rust and the frontend
- **@tauri-apps/api** — Tauri IPC bindings for React

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (stable)
- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ workload

## Running the Project

```bash
npm install
```

**Option 1 — dev server** (hot-reload, edit & see changes instantly):
```bash
tauri-dev.bat dev          # CMD / PowerShell
cmd //c tauri-dev.bat dev  # Git Bash
```

**Option 2 — dev build** (build once, launch many times, no live-reload):
```bash
npm run build:dev   # first time only, or after code changes
npm run start       # every subsequent launch
```

See [docs/running_the_project.md](docs/running_the_project.md) for the full explanation of both modes and the production build.

## Technical Implementations

- ✅ WASAPI loopback capture for system-wide audio recording
- ✅ Tauri IPC command layer bridging React hooks to Rust backend
- ✅ Component-level SCSS modules with shared `theme.scss` design tokens
- ✅ Custom React hooks (`useRecorder`, `useRecordings`) for state management
- ✅ WAV encoding via the `hound` crate with lossless quality
- ✅ `tauri-dev.bat` helper to configure MSVC environment automatically

## Features

- ✅ Record any system audio playing on Windows (videos, music, browser, etc.)
- ✅ Pause and resume recording into the same file
- ✅ Save with a custom name via modal prompt on stop
- ✅ Manage recordings — rename, delete, search, and play back
- ✅ WAV format output with lossless audio quality

## Development

### Available Scripts

```bash
# Development (hot-reload, recordings → project root output/)
tauri-dev.bat dev          # CMD / PowerShell
cmd //c tauri-dev.bat dev  # Git Bash

# Dev build — release binary, recordings still → project root output/
npm run build:dev   # build once
npm run start       # run without rebuilding (aborts if dev build not found)

# Production build — recordings → output/ next to the .exe
npm run build:prod  # produces installer in src-tauri/target/release/bundle/

# Frontend only
npm run dev           # Vite dev server at http://localhost:1420 (no Rust)
npm run build         # tsc + vite build → dist/
npm run preview       # Preview the dist/ folder

# Code Quality
npm run lint          # ESLint — zero warnings allowed
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier format
npm run format:check  # Prettier check without writing
npm run type-check    # TypeScript compiler check (no emit)
npm run lint:rust     # Cargo Clippy — warnings as errors
npm run lint:rust:fix # Cargo Clippy auto-fix
```

See [docs/running_the_project.md](docs/running_the_project.md) for a full explanation of dev vs production builds and output folder behaviour.
