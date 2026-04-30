const { Notification, app } = require('electron');
const fs   = require('fs');
const path = require('path');
const { scanJunk }     = require('./junkScanner.cjs');
const { scanBrowsers } = require('./browserCleaner.cjs');
const { saveScanEntry } = require('./history.cjs');
const { getSystemInfo } = require('./systemInfo.cjs');

let timer = null;

const INTERVAL_MS = {
  hourly:  60 * 60 * 1000,
  '4hr':   4  * 60 * 60 * 1000,
  daily:   24 * 60 * 60 * 1000,
  weekly:  7  * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const DEFAULT_TRIGGERS = {
  diskFreePctBelow: 15,   // disk free under this % → trigger
  memoryPctAbove:   85,   // RAM used above this % → trigger
  triggerCooldownMs: 30 * 60 * 1000, // don't re-fire smart trigger within 30 min
};

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

function readLastRun() {
  try { return JSON.parse(fs.readFileSync(lastScanPath(), 'utf8')); }
  catch { return {}; }
}

function isDue(interval) {
  const last = readLastRun().date;
  if (!last) return true;
  const ms = INTERVAL_MS[interval] || INTERVAL_MS.hourly;
  return Date.now() - new Date(last).getTime() >= ms;
}

function smartTriggerFired(s) {
  const last = readLastRun();
  const cd = (s.triggerCooldownMs ?? DEFAULT_TRIGGERS.triggerCooldownMs);
  if (last.smartTriggerAt && Date.now() - new Date(last.smartTriggerAt).getTime() < cd) {
    return null; // still in cooldown
  }
  const sys = getSystemInfo();
  const diskFreePct = sys.disk.total ? (sys.disk.free / sys.disk.total) * 100 : 100;
  const memPct      = sys.memory.total ? (sys.memory.used / sys.memory.total) * 100 : 0;

  const diskThreshold = s.diskFreePctBelow ?? DEFAULT_TRIGGERS.diskFreePctBelow;
  const memThreshold  = s.memoryPctAbove   ?? DEFAULT_TRIGGERS.memoryPctAbove;

  if (s.smartTriggerDisk !== false && diskFreePct < diskThreshold) {
    return { reason: 'low-disk', detail: `${Math.round(diskFreePct)}% disk free` };
  }
  if (s.smartTriggerMemory !== false && memPct > memThreshold) {
    return { reason: 'high-memory', detail: `${Math.round(memPct)}% RAM used` };
  }
  return null;
}

function markDone(extra = {}) {
  fs.writeFileSync(lastScanPath(), JSON.stringify({
    ...readLastRun(),
    date: new Date().toISOString(),
    ...extra,
  }));
}

async function runOnce(win, opts = {}) {
  try {
    const [junk, browsers] = await Promise.all([scanJunk(), scanBrowsers()]);
    const results = { junk, browsers, duplicates: [], largeFiles: [], malware: [] };
    markDone(opts.smartTrigger ? { smartTriggerAt: new Date().toISOString() } : {});
    saveScanEntry(['junk', 'browsers'], results);

    const totalSize = [...junk, ...browsers].reduce((s, f) => s + (f.size || 0), 0);
    const triggerNote = opts.smartTrigger ? ` (${opts.smartTrigger.detail})` : '';

    if (totalSize > 100 * 1024 * 1024 && Notification.isSupported()) {
      const n = new Notification({
        title: 'PCFixScan',
        body:  `${fmt(totalSize)} of junk found${triggerNote} — click to review.`,
      });
      n.on('click', () => {
        win?.show();
        win?.focus();
        win?.webContents.send('navigate', '/results');
      });
      n.show();
    }
    return totalSize;
  } catch (err) {
    console.error('[auto-scan]', err.message);
    return 0;
  }
}

function start(win) {
  // Tick every 5 min so smart triggers fire promptly under load,
  // but the interval-based scan still only runs when the user's interval has elapsed.
  timer = setInterval(async () => {
    const s = getSettings();
    const enabled = s.autoScan !== false; // default ON
    if (!enabled) return;

    const trigger = smartTriggerFired(s);
    if (trigger) return runOnce(win, { smartTrigger: trigger });

    if (isDue(s.autoScanInterval || 'hourly')) await runOnce(win);
  }, 5 * 60 * 1000);

  // Run once 30 sec after launch (catches "lots of junk piled up overnight")
  setTimeout(() => {
    const s = getSettings();
    if (s.autoScan === false) return;
    const trigger = smartTriggerFired(s);
    if (trigger) return runOnce(win, { smartTrigger: trigger });
    if (isDue(s.autoScanInterval || 'hourly')) runOnce(win);
  }, 30_000);
}

function stop() { clearInterval(timer); timer = null; }

module.exports = { start, stop, runOnce, DEFAULT_TRIGGERS };
