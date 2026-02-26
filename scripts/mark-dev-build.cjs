const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const dir = join(__dirname, '..', 'src-tauri', 'target', 'release');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, '.dev-build'), 'dev-paths');
console.log('  Dev build marker written.');
