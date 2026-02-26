const { unlinkSync, existsSync, copyFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const marker = join(root, 'src-tauri', 'target', 'release', '.dev-build');
if (existsSync(marker)) {
  unlinkSync(marker);
  console.log('  Dev build marker removed — this is a production build.');
}

// Copy the standalone exe to dist/ so it is easy to find alongside the bundled installers.
const src = join(root, 'src-tauri', 'target', 'release', 'audio-capture.exe');
const destDir = join(root, 'dist');
const dest = join(destDir, 'audio-capture.exe');
if (existsSync(src)) {
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log(`  Executable copied to dist/audio-capture.exe`);
} else {
  console.warn('  Warning: release exe not found, skipping copy to dist/.');
}
