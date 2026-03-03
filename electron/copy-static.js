/**
 * Post-build script: copies public/ and .next/static/ into the standalone
 * output so the packaged Electron app can serve them correctly.
 *
 * Next.js standalone mode requires these two folders to exist alongside
 * server.js inside .next/standalone/.
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

// Copy public/ → .next/standalone/public/
copyDir(
  path.join(root, 'public'),
  path.join(standalone, 'public'),
);

// Copy .next/static/ → .next/standalone/.next/static/
copyDir(
  path.join(root, '.next', 'static'),
  path.join(standalone, '.next', 'static'),
);

console.log('Static files copied to standalone.');
