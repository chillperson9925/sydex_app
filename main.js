const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { autoUpdater } = require('electron-updater');

// Auto Updater Configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
const dataFilePath = path.join(app.getPath('userData'), 'kanban_data.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

// Module-level variables
let mainWindow = null;
let tray = null;
let isQuitting = false;
let closeBehavior = 'tray'; // Default close behavior is system tray
let language = 'en'; // Default language

// Handle Hardware Acceleration BEFORE app is ready
let hwAccelEnabled = true;
try {
  if (fsSync.existsSync(settingsFilePath)) {
    const settings = JSON.parse(fsSync.readFileSync(settingsFilePath, 'utf8'));
    if (settings.hardwareAcceleration === false) {
      hwAccelEnabled = false;
    }
    if (settings.closeBehavior) {
      closeBehavior = settings.closeBehavior;
    }
    if (settings.language) {
      language = settings.language;
    }
  }
} catch (e) {
  console.error('Failed to read settings before ready:', e);
}

if (!hwAccelEnabled) {
  app.disableHardwareAcceleration();
}

app.setName('Sydex');

function updateTrayMenu() {
  if (!tray) return;
  const showLabel = language === 'tr' ? 'Sydex\'i Göster' : 'Show Sydex';
  const exitLabel = language === 'tr' ? 'Çıkış' : 'Exit';

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: showLabel, 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: exitLabel, 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'app', 'src', 'assets', 'icon.png');
  if (!fsSync.existsSync(iconPath)) {
    console.error('Tray icon not found at', iconPath);
    return;
  }
  tray = new Tray(iconPath);
  tray.setToolTip('Sydex');
  updateTrayMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Sydex',
    icon: path.join(__dirname, 'app', 'src', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    // titleBarStyle: 'hidden', // We can make it look modern
    autoHideMenuBar: true,
    backgroundColor: '#191919'
  });

  mainWindow.loadFile('app/index.html');

  mainWindow.on('close', (event) => {
    if (!isQuitting && closeBehavior === 'tray') {
      event.preventDefault();
      mainWindow.hide();
    }
  });
};

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Data Persistence
ipcMain.handle('load-data', async () => {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default empty state
      return { boards: [], activeBoardId: null };
    }
    console.error('Failed to load data:', error);
    return { boards: [], activeBoardId: null };
  }
});

ipcMain.handle('save-data', async (event, data) => {
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', async () => {
  try {
    const data = await fs.readFile(settingsFilePath, 'utf8');
    const settings = JSON.parse(data);
    settings.runOnStartup = app.getLoginItemSettings().openAtLogin;
    if (settings.closeBehavior === undefined) {
      settings.closeBehavior = 'tray';
    }
    return settings;
  } catch (error) {
    return { 
      hardwareAcceleration: true, 
      runOnStartup: app.getLoginItemSettings().openAtLogin,
      closeBehavior: 'tray'
    }; // Default
  }
});

ipcMain.handle('save-settings', async (event, data) => {
  try {
    if (data.runOnStartup !== undefined) {
      app.setLoginItemSettings({ openAtLogin: data.runOnStartup });
    }
    if (data.closeBehavior !== undefined) {
      closeBehavior = data.closeBehavior;
    }
    if (data.language !== undefined) {
      language = data.language;
      updateTrayMenu();
    }
    await fs.writeFile(settingsFilePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

// Auto Updater IPC Handlers
autoUpdater.autoDownload = false;

ipcMain.handle('check-for-updates', () => {
  return new Promise((resolve) => {
    const onAvailable = (info) => { cleanup(); resolve({ available: true, info }); };
    const onNotAvailable = () => { cleanup(); resolve({ available: false }); };
    const onError = (err) => { cleanup(); resolve({ available: false, error: err.message }); };
    
    const cleanup = () => {
      autoUpdater.removeListener('update-available', onAvailable);
      autoUpdater.removeListener('update-not-available', onNotAvailable);
      autoUpdater.removeListener('error', onError);
    };

    autoUpdater.once('update-available', onAvailable);
    autoUpdater.once('update-not-available', onNotAvailable);
    autoUpdater.once('error', onError);

    try {
      if (!app.isPackaged) {
        cleanup();
        resolve({ available: false, error: 'App is not packaged' });
        return;
      }
      autoUpdater.checkForUpdates().catch(err => {
        cleanup();
        resolve({ available: false, error: err.message });
      });
    } catch (e) {
      cleanup();
      resolve({ available: false, error: e.message });
    }
  });
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on('download-progress', (progressObj) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('update-progress', progressObj.percent);
  }
});

autoUpdater.on('update-downloaded', () => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('update-downloaded');
  }
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});
