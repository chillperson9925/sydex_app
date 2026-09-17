const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  relaunchApp: () => ipcRenderer.send('relaunch-app'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Updater APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  on_update_progress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value)),
  on_update_downloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback()),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback()),
  on_update_error: (callback) => ipcRenderer.on('update-error', (_event, value) => callback(value)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, value) => callback(value)),
  installUpdate: () => ipcRenderer.send('install-update')
});
