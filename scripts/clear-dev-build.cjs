const { unlinkSync, existsSync } = require('fs');
const { join } = require('path');
const marker = join(__dirname, '..', 'src-tauri', 'target', 'release', '.dev-build');
if (existsSync(marker)) {
  unlinkSync(marker);
  console.log('  Dev build marker removed — this is a production build.');
}
