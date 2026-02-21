const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 📩 Listeners (Main -> Renderer)
    onUpdateAvailable: (callback) => ipcRenderer.on('update_available', (event, value) => callback(value)),
    onUpdateProgress: (callback) => ipcRenderer.on('update_download_progress', (event, value) => callback(value)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', (event, value) => callback(value)),
    onUpdateError: (callback) => ipcRenderer.on('update_error', (event, value) => callback(value)),

    // 🆕 Status Listeners
    onCheckingForUpdate: (callback) => ipcRenderer.on('checking_for_update', (event, value) => callback(value)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update_not_available', (event, value) => callback(value)),

    // 🔄 Update Control
    checkForUpdates: () => ipcRenderer.send('check_for_updates'), // 🆕 Manual Check
    downloadUpdate: () => ipcRenderer.send('download_update'),
    restartApp: () => ipcRenderer.send('restart_app'),
    removeAllUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update_available');
        ipcRenderer.removeAllListeners('update_download_progress');
        ipcRenderer.removeAllListeners('update_downloaded');
        ipcRenderer.removeAllListeners('update_error');
    },
});
