const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

const { getSystemInfo } = require('./core/systemInfo.cjs');
const { scanJunk } = require('./core/junkScanner.cjs');
const { scanBrowsers } = require('./core/browserCleaner.cjs');
const { scanDuplicates } = require('./core/duplicateFinder.cjs');
const { scanLargeFiles } = require('./core/largeFileScanner.cjs');
const { scanMalware } = require('./core/malwareScanner.cjs');
const { getStartupItems, toggleStartupItem } = require('./core/startupManager.cjs');
const { cleanFiles } = require('./core/cleaner.cjs');
const { createTray, destroyTray } = require('./core/tray.cjs');
const { saveScanEntry, saveCleanEntry, getHistory, getStats } = require('./core/history.cjs');
const { getInstalledApps, getAppLeftovers, getAppSize, uninstallApp } = require('./core/appUninstaller.cjs');
const autoScan = require('./core/autoScan.cjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#f3f3f3',
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_DEV_URL || 'http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray(mainWindow, () => mainWindow?.webContents.send('navigate', '/scanner'));
  autoScan.start(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray();
    autoScan.stop();
    app.quit();
  }
});

app.on('before-quit', () => {
  destroyTray();
  autoScan.stop();
});

// ── Settings ───────────────────────────────────────────────────────────────
const fs = require('fs');
const settingsFile = () => require('path').join(app.getPath('userData'), 'settings.json');

ipcMain.handle('settings:save', async (_, settings) => {
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  return { ok: true };
});
ipcMain.handle('settings:get', async () => {
  try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); }
  catch { return {}; }
});

// ── System ─────────────────────────────────────────────────────────────────
ipcMain.handle('system:info', async () => getSystemInfo());

// ── Scan ───────────────────────────────────────────────────────────────────
ipcMain.handle('scan:start', async (event, { categories }) => {
  const results = { junk: [], browsers: [], duplicates: [], largeFiles: [], malware: [] };

  const emit = (cat, pct, found) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('scan:progress', { category: cat, progress: pct, found });
  };

  try {
    if (categories.includes('junk')) { emit('junk', 5, []); results.junk = await scanJunk(); emit('junk', 20, results.junk); }
    if (categories.includes('browsers')) { emit('browsers', 25, []); results.browsers = await scanBrowsers(); emit('browsers', 40, results.browsers); }
    if (categories.includes('duplicates')) { emit('duplicates', 45, []); results.duplicates = await scanDuplicates(); emit('duplicates', 65, results.duplicates); }
    if (categories.includes('largeFiles')) { emit('largeFiles', 70, []); results.largeFiles = await scanLargeFiles(); emit('largeFiles', 85, results.largeFiles); }
    if (categories.includes('malware')) { emit('malware', 88, []); results.malware = await scanMalware(); emit('malware', 100, results.malware); }
    saveScanEntry(categories, results);
  } catch (err) { console.error('[scan]', err.message); }

  return results;
});

// ── Clean ──────────────────────────────────────────────────────────────────
ipcMain.handle('clean:files', async (event, { paths, bytesFreed }) => {
  const result = await cleanFiles(paths);
  if (result.success > 0) saveCleanEntry(result.success, bytesFreed || 0);
  return result;
});

// ── Startup ────────────────────────────────────────────────────────────────
ipcMain.handle('startup:list', async () => getStartupItems());
ipcMain.handle('startup:toggle', async (event, { item, enabled }) => toggleStartupItem(item, enabled));

// ── History ────────────────────────────────────────────────────────────────
ipcMain.handle('history:get', async () => getHistory());
ipcMain.handle('history:stats', async () => getStats());

// ── Uninstaller ────────────────────────────────────────────────────────────
ipcMain.handle('uninstall:list', async () => getInstalledApps());
ipcMain.handle('uninstall:leftovers', async (event, appInfo) => getAppLeftovers(appInfo));
ipcMain.handle('uninstall:size', async (event, appPath) => getAppSize(appPath));
ipcMain.handle('uninstall:remove', async (event, { appInfo, leftoverPaths }) => uninstallApp(appInfo, leftoverPaths, shell));

// ── Shell ──────────────────────────────────────────────────────────────────
ipcMain.handle('shell:openPath', async (event, filePath) => shell.showItemInFolder(filePath));
ipcMain.handle('shell:openURL', async (event, url) => shell.openExternal(url));

// ── Window controls ────────────────────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => { mainWindow?.isMaximized() ? mainWindow.restore() : mainWindow?.maximize(); });
ipcMain.handle('window:close', () => mainWindow?.close());
