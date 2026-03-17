const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const { spawn }  = require('child_process');
const path       = require('path');
const http       = require('http');
const fs         = require('fs');

const PORT    = 3001;
const DEV_URL = `http://localhost:${PORT}`;
let   nextProcess = null;
let   win         = null;

// ── SQLite DB path ─────────────────────────────────────────
function getDbPath() {
  return path.join(app.getPath('userData'), 'kira-takip', 'kira.db');
}

// ── Resolve Next.js standalone app directory ────────────────
// On Windows, Next.js nests standalone output under the full project path
// (e.g. standalone/Desktop/ClaudeProjects/kira-app/server.js)
// On Linux/Mac the server is directly at standalone/server.js
function getStandaloneAppDir() {
  const standaloneBase = path.join(__dirname, '..', '.next', 'standalone');
  const direct = path.join(standaloneBase, 'server.js');
  if (fs.existsSync(direct)) return standaloneBase;

  if (process.platform === 'win32') {
    const appRoot = path.join(__dirname, '..');
    // Strip drive letter (e.g. C:\) → Desktop\ClaudeProjects\kira-app
    const withoutDrive = appRoot.replace(/^[A-Za-z]:[\\/]/, '');
    const nested = path.join(standaloneBase, withoutDrive);
    if (fs.existsSync(path.join(nested, 'server.js'))) return nested;
  }

  return standaloneBase; // fallback
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

  console.log('DB initialized:', dbPath);
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
    process.env.DATABASE_URL = dbUrl;
    await waitForServer(DEV_URL).catch(() => {
      console.error('Start Next.js first: npm run dev');
    });
    createWindow();
  } else {
    const serverScript = path.join(getStandaloneAppDir(), 'server.js');
    nextProcess = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: dbUrl,
      },
      stdio: 'inherit',
    });

    // Handle unexpected server crash after window is shown
    nextProcess.on('exit', (code) => {
      if (code !== 0 && win) {
        win.loadURL(`data:text/html,<h2 style="font-family:sans-serif;padding:40px">Sunucu beklenmedik şekilde kapandı (kod: ${code ?? '?'}). Uygulamayı yeniden başlatın.</h2>`);
      }
    });

    try {
      await waitForServer(DEV_URL);
    } catch (err) {
      dialog.showErrorBox('Başlatma Hatası', 'Uygulama sunucusu başlatılamadı. Lütfen uygulamayı yeniden başlatın.');
      app.quit();
      return;
    }

    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (nextProcess && nextProcess.exitCode === null) nextProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!win) createWindow();
});
