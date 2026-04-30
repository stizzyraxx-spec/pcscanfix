const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const LOCAL = process.env.LOCALAPPDATA || '';
const WIN_TEMP = process.env.TEMP || 'C:\\Windows\\Temp';

// risk: 'safe' (always OK to delete), 'review' (user should glance), 'advanced' (power-user only)
const SCAN_TARGETS = process.platform === 'win32'
  ? [
      { dir: WIN_TEMP, category: 'temp', label: 'User Temp Files', risk: 'safe' },
      { dir: 'C:\\Windows\\Temp', category: 'temp', label: 'Windows Temp', risk: 'safe' },
      { dir: 'C:\\Windows\\Prefetch', category: 'prefetch', label: 'Prefetch Files', risk: 'review' },
      { dir: path.join(LOCAL, 'Temp'), category: 'temp', label: 'Local App Temp', risk: 'safe' },
      { dir: 'C:\\Windows\\SoftwareDistribution\\Download', category: 'update', label: 'Windows Update Cache', risk: 'review' },
      { dir: 'C:\\Windows\\Logs\\CBS', category: 'log', label: 'Component Servicing Logs', risk: 'review' },
      { dir: 'C:\\Windows\\Logs\\WindowsUpdate', category: 'log', label: 'Windows Update Logs', risk: 'review' },
      { dir: 'C:\\Windows.old', category: 'update', label: 'Previous Windows Install', risk: 'advanced' },
      { dir: 'C:\\$Windows.~BT', category: 'update', label: 'Windows Setup Cache', risk: 'advanced' },
      { dir: 'C:\\$Windows.~WS', category: 'update', label: 'Windows Setup Cache', risk: 'advanced' },
      { dir: path.join(LOCAL, 'CrashDumps'), category: 'log', label: 'Crash Dumps', risk: 'safe' },
      { dir: path.join(LOCAL, 'Microsoft', 'Windows', 'WER'), category: 'log', label: 'Error Reports', risk: 'safe' },
    ]
  : [
      { dir: path.join(HOME, 'Library', 'Caches'), category: 'cache', label: 'App Caches', risk: 'safe' },
      { dir: path.join(HOME, 'Library', 'Logs'), category: 'log', label: 'App Logs', risk: 'safe' },
      { dir: path.join(HOME, '.Trash'), category: 'trash', label: 'Trash', risk: 'review' },
      { dir: '/private/tmp', category: 'temp', label: 'System Temp', risk: 'safe' },
      { dir: '/var/folders', category: 'temp', label: 'System Temp Cache', risk: 'review' },
      { dir: path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData'), category: 'cache', label: 'Xcode DerivedData', risk: 'safe' },
      { dir: path.join(HOME, 'Library', 'Application Support', 'CrashReporter'), category: 'log', label: 'Crash Reports', risk: 'safe' },
    ];

function statFile(filePath) {
  try { return fs.statSync(filePath); }
  catch { return null; }
}

function scanDir(dirPath, target, maxDepth = 2, depth = 0) {
  const results = [];
  if (depth > maxDepth) return results;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isFile()) {
          const st = statFile(full);
          if (!st) continue;
          results.push({
            path: full,
            name: entry.name,
            size: st.size,
            category: target.category,
            label: target.label,
            risk: target.risk,
            lastAccessed: st.atimeMs,
            modified: st.mtimeMs,
          });
        } else if (entry.isDirectory() && depth < maxDepth) {
          results.push(...scanDir(full, target, maxDepth, depth + 1));
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip inaccessible */ }
  return results;
}

async function scanJunk() {
  const results = [];
  for (const target of SCAN_TARGETS) {
    if (!fs.existsSync(target.dir)) continue;
    results.push(...scanDir(target.dir, target));
  }
  return results;
}

module.exports = { scanJunk };
