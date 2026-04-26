const { Notification, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { scanJunk } = require('./junkScanner.cjs');
const { scanBrowsers } = require('./browserCleaner.cjs');
const { saveScanEntry } = require('./history.cjs');

let timer = null;

function fmt(b) {
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b || 1) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function settingsPath() { return path.join(app.getPath('userData'), 'settings.json'); }
function lastScanPath() { return path.join(app.getPath('userData'), 'last-auto-scan.json'); }

function getSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); }
  catch { return {}; }
}

function isDue(interval) {
  try {
    const last = JSON.parse(fs.readFileSync(lastScanPath(), 'utf8')).date;
    const ms = { daily: 86400000, weekly: 604800000, monthly: 2592000000 }[interval] || 604800000;
    return Date.now() - new Date(last).getTime() >= ms;
  } catch { return true; }
}

function markDone() {
  fs.writeFileSync(lastScanPath(), JSON.stringify({ date: new Date().toISOString() }));
}

function start(win) {
  timer = setInterval(async () => {
    const s = getSettings();
    if (!s.autoScan || !isDue(s.autoScanInterval || 'weekly')) return;

    try {
      const [junk, browsers] = await Promise.all([scanJunk(), scanBrowsers()]);
      const results = { junk, browsers, duplicates: [], largeFiles: [], malware: [] };
      markDone();
      saveScanEntry(['junk', 'browsers'], results);

      const totalSize = [...junk, ...browsers].reduce((s, f) => s + (f.size || 0), 0);
      if (totalSize > 50 * 1024 * 1024 && Notification.isSupported()) {
        const n = new Notification({ title: 'PCScanFix', body: `Found ${fmt(totalSize)} ready to clean.` });
        n.on('click', () => { win?.show(); win?.focus(); win?.webContents.send('navigate', '/results'); });
        n.show();
      }
    } catch (err) {
      console.error('[auto-scan]', err.message);
    }
  }, 3_600_000);
}

function stop() { clearInterval(timer); }

module.exports = { start, stop };
