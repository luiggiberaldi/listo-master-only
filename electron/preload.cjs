const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Add secure methods here if needed
    // Example: sendNotification: (msg) => ipcRenderer.send('notify', msg)
});
