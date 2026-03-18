/**
 * Creates a distributable ZIP from the win-unpacked Electron build output.
 * Uses PowerShell Compress-Archive (Windows) to avoid symlink permission issues
 * that occur with electron-builder's portable target on Windows without Developer Mode.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const root    = path.join(__dirname, '..');
const version = require('../package.json').version;

// electron-builder --dir outputs to platform-specific directories
const candidates = ['win-unpacked', 'mac', 'mac-arm64', 'mac-x64', 'linux-unpacked'];
const unpacked = candidates
  .map(c => path.join(root, 'dist', c))
  .find(p => fs.existsSync(p));

if (!unpacked) {
  console.error('No unpacked build directory found in dist/. Run electron-builder --dir first.');
  process.exit(1);
}

const outputZip = path.join(root, 'dist', `KiraTakip-v${version}-portable.zip`);

if (fs.existsSync(outputZip)) fs.unlinkSync(outputZip);

if (process.platform === 'win32') {
  execSync(
    `powershell -Command "Compress-Archive -Path '${unpacked}\\*' -DestinationPath '${outputZip}'"`,
    { stdio: 'inherit' }
  );
} else {
  execSync(`zip -r "${outputZip}" .`, { cwd: unpacked, stdio: 'inherit' });
}

const sizeMb = (fs.statSync(outputZip).size / 1_048_576).toFixed(1);
console.log(`\nKiraTakip-v${version}-portable.zip created — ${sizeMb} MB`);
console.log(`Location: ${outputZip}`);
