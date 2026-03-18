/**
 * Post-build script: copies public/ and .next/static/ into the standalone
 * output so the packaged Electron app can serve them correctly.
 *
 * On Windows, Next.js standalone nests output under the full project path
 * (e.g. standalone/Desktop/ClaudeProjects/kira-app/server.js).
 * This script detects the correct target directory automatically.
 *
 * Also dereferences symlinks on Windows so electron-builder does not fail
 * with EPERM errors when packaging (Windows requires Developer Mode to create
 * symlinks; nft creates them during next build for deduplicated packages).
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

// ── Dereference symlinks (Windows EPERM fix) ─────────────────────────────────
// electron-builder cannot create OS-level symlinks on Windows without Developer
// Mode enabled. nft (Next.js node-file-tracer) creates real NTFS symlinks for
// deduplicated packages inside .next/standalone/node_modules. Replacing them
// with real copies before electron-builder runs eliminates the EPERM.
function dereferenceSymlinks(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      try {
        const realPath = fs.realpathSync(fullPath);
        const stat     = fs.statSync(realPath);
        fs.unlinkSync(fullPath);
        if (stat.isDirectory()) {
          copyDir(realPath, fullPath);
        } else {
          fs.copyFileSync(realPath, fullPath);
        }
      } catch { /* skip if target is missing or inaccessible */ }
    } else if (entry.isDirectory()) {
      dereferenceSymlinks(fullPath);
    }
  }
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

// Replace symlinks with real copies so electron-builder can package without EPERM.
// Runs across the entire standalone tree to catch symlinks at any nesting depth.
if (process.platform === 'win32') {
  console.log('Dereferencing symlinks in standalone (Windows packaging fix)...');
  dereferenceSymlinks(standalone);
  console.log('Dereference complete.');
}
