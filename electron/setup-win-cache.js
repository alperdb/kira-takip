/**
 * Pre-populates the electron-builder winCodeSign cache on Windows.
 *
 * electron-builder downloads winCodeSign-2.6.0.7z to set up its Windows
 * code-signing toolchain. That archive contains macOS dylib files stored as
 * symlinks. On Windows without Developer Mode, 7-Zip cannot create symlinks
 * (EPERM) and the extraction fails — blocking any build, even unsigned ones.
 *
 * This script:
 *   1. Checks whether the cache directory already exists (no-op if so).
 *   2. Downloads the archive.
 *   3. Extracts it with 7-Zip while EXCLUDING the darwin/ directory
 *      (the only part that contains symlinks). Windows-only tools land intact.
 *   4. Places the result exactly where electron-builder expects it.
 *
 * electron-builder's cache check is existence-only: if the directory exists
 * it skips the download and uses whatever is there.
 */

const { execFileSync } = require('child_process');
const https  = require('https');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');

if (process.platform !== 'win32') process.exit(0);

const VERSION  = 'winCodeSign-2.6.0';
const DL_URL   = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${VERSION}/${VERSION}.7z`;

const localAppData = process.env.LOCALAPPDATA ||
  path.join(os.homedir(), 'AppData', 'Local');
const cacheDir = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign', VERSION);

// electron-builder only checks directory existence — skip if already there.
if (fs.existsSync(cacheDir)) {
  console.log('winCodeSign cache already present, skipping setup.');
  process.exit(0);
}

const sevenZip   = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
const archiveTmp = path.join(os.tmpdir(), `${VERSION}-${Date.now()}.7z`);

// Follow redirects
function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log(`Downloading ${VERSION}...`);
  await download(DL_URL, archiveTmp);

  fs.mkdirSync(cacheDir, { recursive: true });

  console.log('Extracting (excluding darwin symlinks)...');
  execFileSync(sevenZip, [
    'x', archiveTmp,
    `-o${cacheDir}`,
    '-xr!darwin',   // skip macOS dylibs — these are symlinks that EPERM on Windows
    '-xr!linux',    // skip Linux-specific files for the same reason
    '-bd',          // no progress bar
    '-y',           // yes to all prompts
  ], { stdio: 'inherit' });

  try { fs.unlinkSync(archiveTmp); } catch { /* ignore */ }

  console.log('winCodeSign cache ready:', cacheDir);
}

main().catch(err => {
  console.error('winCodeSign cache setup failed:', err.message);
  process.exit(1);
});
