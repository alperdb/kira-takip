/**
 * Creates a distributable ZIP from the win-unpacked Electron build output.
 * Uses PowerShell Compress-Archive (Windows) to avoid symlink permission issues
 * that occur with electron-builder's portable target on Windows without Developer Mode.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const root      = path.join(__dirname, '..');
const unpacked  = path.join(root, 'dist', 'win-unpacked');
const outputZip = path.join(root, 'dist', 'KiraTakip-portable.zip');

if (!fs.existsSync(unpacked)) {
  console.error('win-unpacked directory not found. Run electron-builder --dir first.');
  process.exit(1);
}

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
console.log(`\nKiraTakip-portable.zip created — ${sizeMb} MB`);
console.log(`Location: ${outputZip}`);
