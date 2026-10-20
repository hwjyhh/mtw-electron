const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1680,
    height: 960,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    title: '现代战术兵棋 MTW v7.0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'index.html'));

  win.webContents.on('before-input-event', (e, input) => {
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      e.preventDefault();
    }
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      e.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
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