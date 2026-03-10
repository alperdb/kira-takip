const { app, BrowserWindow, shell, ipcMain } = require('electron');
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

// ── Init schema using Prisma binary engine (no ABI issues) ─
async function initDatabase(dbPath) {
  if (fs.existsSync(dbPath)) return;   // DB already exists — skip

  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const isDev = !app.isPackaged;

  // Resolve @prisma/client and its query engine binary.
  // In packaged app, we load from the standalone's node_modules.
  const clientDir = isDev
    ? path.join(__dirname, '..', 'node_modules', '@prisma', 'client')
    : path.join(__dirname, '..', '.next', 'standalone', 'node_modules', '@prisma', 'client');

  const enginesDir = isDev
    ? path.join(__dirname, '..', 'node_modules', '@prisma', 'engines')
    : path.join(__dirname, '..', '.next', 'standalone', 'node_modules', '@prisma', 'engines');

  // Find the query-engine binary (e.g. query-engine-windows.exe)
  if (fs.existsSync(enginesDir)) {
    const bin = fs.readdirSync(enginesDir).find(f =>
      f.startsWith('query-engine') &&
      (process.platform === 'win32' ? f.endsWith('.exe') : !f.includes('.'))
    );
    if (bin) process.env.PRISMA_QUERY_ENGINE_BINARY = path.join(enginesDir, bin);
  }

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
function waitForServer(url, retries = 30) {
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

  await initDatabase(dbPath);

  const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;

  if (isDev) {
    process.env.DATABASE_URL = dbUrl;
    await waitForServer(DEV_URL).catch(() => {
      console.error('Start Next.js first: npm run dev');
    });
    createWindow();
  } else {
    const serverScript = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
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
    await waitForServer(DEV_URL);
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!win) createWindow();
});
