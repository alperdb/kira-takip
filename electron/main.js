const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path       = require('path');
const http       = require('http');
const fs         = require('fs');

const PORT    = 3001;
const DEV_URL = `http://localhost:${PORT}`;
let   win         = null;

// ── SQLite DB path ─────────────────────────────────────────
function getDbPath() {
  return path.join(app.getPath('userData'), 'kira-takip', 'kira.db');
}

// ── Resolve Next.js standalone app directory ────────────────
// On macOS/Linux, Next.js puts server.js directly at standalone/server.js.
// On Windows, it nests under the full build-machine path (e.g.
//   standalone/Users/dev/project/server.js).
// We walk the tree so packaged builds work on any end-user machine regardless
// of where the developer built the app.
function getStandaloneAppDir() {
  const standaloneBase = path.join(__dirname, '..', '.next', 'standalone');

  if (fs.existsSync(path.join(standaloneBase, 'server.js'))) return standaloneBase;

  function findServerDir(dir, depth) {
    if (depth === 0) return null;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const sub = path.join(dir, entry.name);
        if (fs.existsSync(path.join(sub, 'server.js'))) return sub;
        const found = findServerDir(sub, depth - 1);
        if (found) return found;
      }
    } catch { /* ignore permission errors */ }
    return null;
  }

  return findServerDir(standaloneBase, 6) ?? standaloneBase;
}

// ── Resolve Prisma query engine binary path (always call before spawning Next.js) ──
function resolvePrismaEnginePath(isDev) {
  const standaloneAppDir = isDev ? null : getStandaloneAppDir();
  const nodeModulesBase  = isDev
    ? path.join(__dirname, '..', 'node_modules')
    : path.join(standaloneAppDir, 'node_modules');

  const enginesDir = path.join(nodeModulesBase, '@prisma', 'engines');
  if (fs.existsSync(enginesDir)) {
    const bin = fs.readdirSync(enginesDir).find(f =>
      f.startsWith('query-engine') &&
      (process.platform === 'win32' ? f.endsWith('.exe') : !f.includes('.'))
    );
    if (bin) {
      process.env.PRISMA_QUERY_ENGINE_BINARY = path.join(enginesDir, bin);
    }
  }
  return nodeModulesBase;
}

// ── Init schema using Prisma binary engine (no ABI issues) ─
async function initDatabase(dbPath, nodeModulesBase) {
  if (fs.existsSync(dbPath)) return;   // DB already exists — skip

  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const clientDir = path.join(nodeModulesBase, '@prisma', 'client');

  process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, '/')}`;

  // Use Prisma to run raw CREATE TABLE statements
  const { PrismaClient } = require(clientDir);
  const prisma = new PrismaClient();

  const schemaSQL = fs.readFileSync(path.join(__dirname, 'sqlite-schema.sql'), 'utf8');
  const statements = schemaSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 4 && !s.startsWith('--'));

  await prisma.$connect();
  for (const stmt of statements) {
    if (stmt.toUpperCase().startsWith('PRAGMA')) {
      await prisma.$queryRawUnsafe(stmt);   // PRAGMAs return results
    } else {
      await prisma.$executeRawUnsafe(stmt); // DDL statements
    }
  }
  await prisma.$disconnect();

}

// ── Wait until Next.js server is ready ────────────────────
function waitForServer(url, retries = 60) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (++tries >= retries) return reject(new Error('Next.js did not start'));
      setTimeout(check, 1000);
    };
    check();
  });
}

// ── Create Electron window ─────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width:    1400,
    height:   900,
    minWidth: 960,
    minHeight: 640,
    title:    'Kira Takip',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration:  false,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#F8FAFC',
    show: false,
  });

  win.loadURL(DEV_URL);
  win.once('ready-to-show', () => win.show());
  // Fallback: force-show after 6s if ready-to-show never fires (e.g. render crash)
  setTimeout(() => { if (win && !win.isVisible()) win.show(); }, 6000);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.setMenuBarVisibility(false);
  win.on('closed', () => { win = null; });
}

// ── IPC: relaunch (Settings → Reset Data) ─────────────────
ipcMain.handle('relaunch', () => {
  app.relaunch();
  app.exit(0);
});

// ── App lifecycle ──────────────────────────────────────────
app.whenReady().then(async () => {
  const isDev  = !app.isPackaged;
  const dbPath = getDbPath();

  // Resolve Prisma engine path first — must happen before initDatabase AND before
  // spawning the Next.js server, regardless of whether the DB already exists.
  const nodeModulesBase = resolvePrismaEnginePath(isDev);

  await initDatabase(dbPath, nodeModulesBase);

  const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;

  if (isDev) {
    process.env.DATABASE_URL     = dbUrl;
    process.env.ELECTRON_DB_PATH = dbPath;
    await waitForServer(DEV_URL).catch(() => {
      console.error('Start Next.js first: npm run dev');
    });
    createWindow();
  } else {
    const serverScript = path.join(getStandaloneAppDir(), 'server.js');

    // Run Next.js standalone server inside the main process.
    // Using require() avoids spawning a second packaged-app binary (which would
    // open a second Electron window and recursively attempt to start another server).
    process.env.PORT             = String(PORT);
    process.env.NODE_ENV         = 'production';
    process.env.HOSTNAME         = '127.0.0.1';
    process.env.DATABASE_URL     = dbUrl;
    process.env.ELECTRON_DB_PATH = dbPath;

    try {
      require(serverScript);
    } catch (err) {
      dialog.showErrorBox('Başlatma Hatası', `Sunucu yüklenemedi:\n${err.message}`);
      app.quit();
      return;
    }

    try {
      await waitForServer(DEV_URL);
    } catch {
      dialog.showErrorBox('Başlatma Hatası', 'Uygulama sunucusu başlatılamadı. Lütfen uygulamayı yeniden başlatın.');
      app.quit();
      return;
    }

    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!win) createWindow();
});
