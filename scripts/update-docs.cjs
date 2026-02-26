const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const docsFile = path.join(root, 'docs', 'running_the_project.md');

let content = fs.readFileSync(docsFile, 'utf8');

// Find and replace the Configuration section body
const oldStart = 'The file `audio-capture.toml` controls recording behaviour.';
const oldEnd   = 'stays consistent even if you change your system volume.';

const si = content.indexOf(oldStart);
const ei = content.indexOf(oldEnd, si) + oldEnd.length;

if (si === -1 || ei === -1 + oldEnd.length) {
  console.error('Markers not found! si=' + si + ' ei=' + ei);
  process.exit(1);
}

const replacement = `The file \`audio-capture.toml\` controls recording behaviour. It is created automatically with defaults on the first run if it doesn\u2019t exist.

### \`gain_multiplier\` \u2014 the 0\u202fdB reference

\`gain_multiplier\` sets the **baseline** capture level. The in-app gain slider adjusts \u00b16\u202fdB _around_ this value:

| Slider position | Effective gain |
|---|---|
| \u22126\u202fdB | \`gain_multiplier \u00d7 0.50\` |
| 0\u202fdB (centre) | \`gain_multiplier \u00d7 1.00\` \u2190 this is the TOML value |
| +6\u202fdB | \`gain_multiplier \u00d7 2.00\` |

The UI slider resets to 0\u202fdB each session. \`gain_multiplier\` is where you permanently raise or lower the floor.

\`\`\`toml
# audio-capture.toml

# Baseline ("0 dB") reference for the in-app gain slider.
# The recorder also compensates for system volume automatically.
#
#   1.0  \u2192  match system level  (0 dB baseline)
#   2.0  \u2192  +6 dB baseline
#   3.0  \u2192  +9.5 dB baseline  (default)
#   4.0  \u2192  +12 dB baseline
gain_multiplier = 3.0
\`\`\`

**Tips:**
- Edit the file while the app is open; changes apply the next time you press Record.
- Use the in-app slider for per-recording tweaks (\u22126 to +6\u202fdB relative to this baseline).
- If recordings are consistently too quiet, raise \`gain_multiplier\` (try \`4.0\` or \`5.0\`).
- If recordings clip/distort even at \u22126\u202fdB on the slider, lower \`gain_multiplier\`.
- The gain compensates for system volume automatically, so the recorded level stays consistent even if you change your speaker volume.`;

content = content.slice(0, si) + replacement + content.slice(ei);
fs.writeFileSync(docsFile, content, 'utf8');
console.log('Done — docs updated.');
