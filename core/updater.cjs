const { app, dialog } = require('electron');

let updater;
function getUpdater() {
  if (!updater) {
    try { updater = require('electron-updater').autoUpdater; }
    catch { return null; }
  }
  return updater;
}

function setupAutoUpdater(mainWindow) {
  // Skip in dev — there's no signed build to update against
  if (!app.isPackaged) return;

  const u = getUpdater();
  if (!u) return;

  u.autoDownload = false;
  u.autoInstallOnAppQuit = true;

  u.on('update-available', async (info) => {
    if (mainWindow.isDestroyed()) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update available',
      message: `PCFixScan ${info.version} is available.`,
      detail: 'Download in the background?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) u.downloadUpdate().catch(err => console.error('[updater] download:', err));
  });

  u.on('update-downloaded', async (info) => {
    if (mainWindow.isDestroyed()) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update ready',
      message: `PCFixScan ${info.version} downloaded.`,
      detail: 'Install now (app restarts) or wait until you quit?',
      buttons: ['Install now', 'On quit'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) u.quitAndInstall();
  });

  u.on('error', (err) => {
    console.error('[updater]', err?.message || err);
  });

  // Initial check + every 6 hours
  u.checkForUpdates().catch(err => console.error('[updater] initial:', err));
  setInterval(() => u.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

module.exports = { setupAutoUpdater };
