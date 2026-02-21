const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// --- CONFIGURACIÓN DE ACTUALIZACIONES ---
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

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

        // AutoUpdater con retraso
        setTimeout(() => {
            setupAutoUpdater(mainWindow);
        }, 5000);
    });

    // --- ACTUALIZACIONES AUTOMÁTICAS ---
    function setupAutoUpdater(mainWindow) {
        console.log('🔄 [AutoUpdater] Iniciando verificación...');

        autoUpdater.checkForUpdates();

        autoUpdater.on('checking-for-update', () => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('checking_for_update');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('⬇️ [AutoUpdater] Actualización disponible:', info.version);
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update_available', info);
        });

        autoUpdater.on('update-not-available', () => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update_not_available');
        });

        autoUpdater.on('error', (err) => {
            console.error('❌ [AutoUpdater] Error:', err);
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update_error', err.message);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update_download_progress', progressObj);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('✅ [AutoUpdater] Descarga completada.');
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update_downloaded', info);
        });
    }

    // --- IPC: Manual Update ---
    ipcMain.on('check_for_updates', () => {
        autoUpdater.checkForUpdates();
    });

    ipcMain.on('download_update', () => {
        autoUpdater.downloadUpdate();
    });

    ipcMain.on('restart_app', () => {
        autoUpdater.quitAndInstall();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}
