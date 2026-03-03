const { app, BrowserWindow, shell } = require('electron');
const { spawn }                      = require('child_process');
const path                           = require('path');
const http                           = require('http');

const PORT    = 3001;
const DEV_URL = `http://localhost:${PORT}`;
let   nextProcess = null;
let   win         = null;

// ── Wait until Next.js server is ready ──────────────────
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

// ── Create Electron window ───────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width:    1400,
    height:   900,
    minWidth: 960,
    minHeight: 640,
    title:    'Kira Takip',
    // icon: path.join(__dirname, 'icon.png'),  // add icon.png here
    webPreferences: {
      contextIsolation: true,
      nodeIntegration:  false,
    },
    backgroundColor: '#F8FAFC',
    show: false,   // show after ready-to-show
  });

  win.loadURL(DEV_URL);

  // Show when fully rendered (no white flash)
  win.once('ready-to-show', () => win.show());

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Remove default menu bar
  win.setMenuBarVisibility(false);

  win.on('closed', () => { win = null; });
}

// ── App lifecycle ────────────────────────────────────────
app.whenReady().then(async () => {
  const isDev = !app.isPackaged;

  if (isDev) {
    // In dev: Next.js is already running on port 3001 (npm run dev)
    // Just open the window — don't start another server
    await waitForServer(DEV_URL).catch(() => {
      console.error('⚠️  Start Next.js first: npm run dev');
    });
    createWindow();
  } else {
    // In production: spawn the bundled standalone Next.js server
    // electron/main.js is at resources/app/electron/main.js
    // standalone server is at resources/app/.next/standalone/server.js
    const serverScript = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
    nextProcess = spawn(process.execPath, [serverScript], {
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production',
             HOSTNAME: '127.0.0.1' },
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
