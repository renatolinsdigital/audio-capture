import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const exe = join(root, 'src-tauri', 'target', 'release', 'audio-capture.exe');
const sentinel = join(root, 'src-tauri', 'target', 'release', '.dev-build');

if (!existsSync(exe) || !existsSync(sentinel)) {
  console.error('');
  console.error('  Error: dev build not found.');
  console.error('  Run this first:');
  console.error('');
  console.error('    CMD / PowerShell :  tauri-dev.bat build:dev');
  console.error('    Git Bash         :  cmd //c tauri-dev.bat build:dev');
  console.error('');
  process.exit(1);
}

const result = spawnSync(exe, { stdio: 'inherit', shell: false });
process.exit(result.status ?? 0);
