const { app, BrowserWindow } = require('electron');
const path = require('path');

// 🛡️ Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    let mainWindow;

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            title: "Listo Master",
            backgroundColor: '#0f172a', // Slate-950
            icon: path.join(__dirname, '../public/master-logo.png'), // Logo del sistema
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.cjs')
            }
        });

        // Remove Menu Bar
        mainWindow.setMenuBarVisibility(false);

        // Load App
        const isDev = !app.isPackaged;

        if (isDev) {
            mainWindow.loadURL('http://localhost:5174'); // Vite Dev Server Port for Master
            // mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
    }

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}
