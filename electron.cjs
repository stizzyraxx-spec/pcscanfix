const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const REMOTE_URL = 'https://pcfixscan.com';
let isQuitting = false;

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
const { setupAutoUpdater } = require('./core/updater.cjs');
const { getSnapshot, killProcess } = require('./core/performanceMonitor.cjs');
const { scanPrivacy, clearPrivacy } = require('./core/privacyCleaner.cjs');
const { scanRegistry, cleanRegistry, restoreBackup, listBackups } = require('./core/registryCleaner.cjs');
const { getDiskHealth, analyzeDefrag } = require('./core/diskHealth.cjs');
const { exportCSV, exportPDF } = require('./core/reports.cjs');
const { listDeletions, clearDeletions } = require('./core/safety.cjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#f3f3f3',
    title: 'PCFixScan',
    icon: path.join(__dirname, 'build', 'icon.png'),
    // Native title bar — OS-standard close/min/max + drag region + app name.
    // hiddenInset on Mac keeps the traffic lights but inset for a slightly cleaner look.
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Lock the title to "PCFixScan" — without this, the page <title> overwrites it
  // (which would say "PCFixScan — Cross-platform PC Cleanup…")
  mainWindow.on('page-title-updated', (e) => e.preventDefault());
  mainWindow.setTitle('PCFixScan');

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_DEV_URL || 'http://localhost:5173');
  } else {
    // Production: load the live website. Any push to pcfixscan.com is instantly reflected.
    // Local dist/index.html is the offline fallback only.
    mainWindow.loadURL(REMOTE_URL).catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Closing the window hides it; only Quit (cmd+Q / tray menu) actually exits.
  // App stays alive in background so auto-scan can run.
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') app.dock?.hide();
    }
  });
}

// ─── Auto-launch on login (background by default) ─────────────────────────────
function configureLoginItem(enabled = true) {
  if (isDev) return; // never auto-launch in dev
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,                   // start in tray, no window
    args: ['--hidden'],
  });
}

// Single instance — second launch reveals the existing window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else app.on('second-instance', () => { mainWindow?.show(); mainWindow?.focus(); });

app.whenReady().then(() => {
  createWindow();
  configureLoginItem(true);
  createTray(mainWindow, () => mainWindow?.webContents.send('navigate', '/scanner'));
  autoScan.start(mainWindow);
  setupAutoUpdater(mainWindow);

  // Hide window if launched with --hidden (auto-launch on login)
  if (process.argv.includes('--hidden')) {
    mainWindow.hide();
    if (process.platform === 'darwin') app.dock?.hide();
  }

  app.on('activate', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    else createWindow();
    if (process.platform === 'darwin') app.dock?.show();
  });
});

// App stays alive in background — never auto-quit on window close.
app.on('window-all-closed', (e) => { e.preventDefault?.(); });

app.on('before-quit', () => {
  isQuitting = true;
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

// ── License expiry notification ────────────────────────────────────────────
const { Notification } = require('electron');
ipcMain.handle('license:expired', (event, reason) => {
  const messages = {
    expired:           'Your subscription has expired. Renew at pcfixscan.com to continue.',
    revoked:           'Your license has been revoked. Contact support@pcfixscan.com.',
    past_due_expired:  'Payment failed and the grace period ended. Update payment at pcfixscan.com/account.',
  };
  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'PCFixScan subscription ended',
      body:  messages[reason] || 'Your subscription is no longer active.',
    });
    n.on('click', () => shell.openExternal('https://pcfixscan.com/account'));
    n.show();
  }
});

// ── Window controls ────────────────────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => { mainWindow?.isMaximized() ? mainWindow.restore() : mainWindow?.maximize(); });
ipcMain.handle('window:close', () => mainWindow?.close());

// ── Performance monitor ────────────────────────────────────────────────────
ipcMain.handle('perf:snapshot', async () => getSnapshot());
ipcMain.handle('perf:kill',     async (_, pid) => killProcess(pid));

// ── Privacy cleaner ────────────────────────────────────────────────────────
ipcMain.handle('privacy:scan',  async () => scanPrivacy());
ipcMain.handle('privacy:clear', async (_, opts) => clearPrivacy(opts));

// ── Registry cleaner (Windows) ─────────────────────────────────────────────
ipcMain.handle('registry:scan',    async () => scanRegistry());
ipcMain.handle('registry:clean',   async (_, items) => cleanRegistry(items));
ipcMain.handle('registry:backups', async () => listBackups());
ipcMain.handle('registry:restore', async (_, file) => restoreBackup(file));

// ── Disk health ────────────────────────────────────────────────────────────
ipcMain.handle('disk:health',  async () => getDiskHealth());
ipcMain.handle('disk:defrag-analyze', async () => analyzeDefrag());

// ── Reports ────────────────────────────────────────────────────────────────
ipcMain.handle('report:csv', async () => exportCSV());
ipcMain.handle('report:pdf', async () => exportPDF());

// ── Undo / deletion log ────────────────────────────────────────────────────
ipcMain.handle('undo:list',  async () => listDeletions());
ipcMain.handle('undo:clear', async () => { clearDeletions(); return { ok: true }; });
