/**
 * Post-build script: copies public/ and .next/static/ into the standalone
 * output so the packaged Electron app can serve them correctly.
 *
 * On Windows, Next.js standalone nests output under the full project path
 * (e.g. standalone/Desktop/ClaudeProjects/kira-app/server.js).
 * This script detects the correct target directory automatically.
 */

const fs   = require('fs');
const path = require('path');

const root       = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Resolve the directory where server.js actually lives
function getStandaloneAppDir() {
  if (fs.existsSync(path.join(standalone, 'server.js'))) return standalone;

  if (process.platform === 'win32') {
    const withoutDrive = root.replace(/^[A-Za-z]:[\\/]/, '');
    const nested = path.join(standalone, withoutDrive);
    if (fs.existsSync(path.join(nested, 'server.js'))) return nested;
  }

  return standalone;
}

const appDir = getStandaloneAppDir();

// Copy public/ → <appDir>/public/
copyDir(
  path.join(root, 'public'),
  path.join(appDir, 'public'),
);

// Copy .next/static/ → <appDir>/.next/static/
copyDir(
  path.join(root, '.next', 'static'),
  path.join(appDir, '.next', 'static'),
);

console.log('Static files copied to:', appDir);
