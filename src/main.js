const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const ElectronStore = require('electron-store');
const keytar = require('keytar');

dotenv.config();

const Store = ElectronStore.default || ElectronStore;
const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Allow self-signed SSL certificates in development (ASP.NET dev cert)
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(true);
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    useContentSize: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open DevTools only while developing.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  const apiBaseUrl = process.env.API_BASE_URL || '';
  const apiOrigin = (() => {
    try {
      return new URL(apiBaseUrl).origin;
    } catch {
      return '';
    }
  })();
  const apiSocketOrigin = (() => {
    try {
      const parsed = new URL(apiBaseUrl);
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${parsed.host}`;
    } catch {
      return '';
    }
  })();
  const connectSrc = [
    "'self'",
    'https:',
    'wss:',
    'http://localhost:3000',
    'ws://localhost:3000',
    'http://localhost:5035',
    'https://localhost:5035',
    'ws://localhost:5035',
    'wss://localhost:5035',
    apiOrigin,
    apiSocketOrigin,
  ]
    .filter(Boolean)
    .join(' ');

  // Allow the renderer to connect to the local backend server.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; connect-src ${connectSrc}`,
        ],
      },
    });
  });

  ipcMain.handle('get-machine-id', async () => {
    const nets = os.networkInterfaces();
    let macs = [];

    for (const name of Object.keys(nets)) {
      const entries = nets[name] || [];
      for (const ni of entries) {
        if (ni && !ni.internal && ni.mac && ni.mac !== '00:00:00:00:00:00') {
          macs.push(ni.mac);
        }
      }
    }

    macs = Array.from(new Set(macs)).sort();
    const seed = `${os.hostname()}|${os.platform()}|${macs.join(',')}`;
    return crypto.createHash('sha256').update(seed).digest('hex');
  });

  ipcMain.handle('store-license', async (_event, licenseKey) => {
    if (!licenseKey || typeof licenseKey !== 'string') return false;
    await keytar.setPassword('TyreTech', 'license', licenseKey);
    store.set('license.lastValidatedAt', Date.now());
    return true;
  });

  ipcMain.handle('get-license', async () => {
    return keytar.getPassword('TyreTech', 'license');
  });

  ipcMain.handle('clear-license', async () => {
    store.delete('license.lastValidatedAt');
    store.delete('license.expiresAt');
    return keytar.deletePassword('TyreTech', 'license');
  });

  ipcMain.handle('get-config', () => {
    return { API_BASE_URL: apiBaseUrl };
  });

  ipcMain.handle('set-cache', (_event, key, value) => {
    store.set(String(key), value);
    return true;
  });

  ipcMain.handle('get-cache', (_event, key) => {
    return store.get(String(key));
  });

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
