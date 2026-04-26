const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const LOCAL = process.env.LOCALAPPDATA || '';
const WIN_TEMP = process.env.TEMP || 'C:\\Windows\\Temp';

const SCAN_TARGETS = process.platform === 'win32'
  ? [
      { dir: WIN_TEMP, category: 'temp', label: 'User Temp Files' },
      { dir: 'C:\\Windows\\Temp', category: 'temp', label: 'Windows Temp' },
      { dir: 'C:\\Windows\\Prefetch', category: 'prefetch', label: 'Prefetch Files' },
      { dir: path.join(LOCAL, 'Temp'), category: 'temp', label: 'Local App Temp' },
      { dir: 'C:\\Windows\\SoftwareDistribution\\Download', category: 'update', label: 'Windows Update Cache' },
    ]
  : [
      { dir: path.join(HOME, 'Library', 'Caches'), category: 'cache', label: 'App Caches' },
      { dir: path.join(HOME, 'Library', 'Logs'), category: 'log', label: 'App Logs' },
      { dir: path.join(HOME, '.Trash'), category: 'trash', label: 'Trash' },
      { dir: '/private/tmp', category: 'temp', label: 'System Temp' },
      { dir: '/var/folders', category: 'temp', label: 'System Temp Cache' },
    ];

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function scanDir(dirPath, category, label, maxDepth = 2, depth = 0) {
  const results = [];
  if (depth > maxDepth) return results;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isFile()) {
          const size = getFileSize(full);
          results.push({ path: full, name: entry.name, size, category, label });
        } else if (entry.isDirectory() && depth < maxDepth) {
          results.push(...scanDir(full, category, label, maxDepth, depth + 1));
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
    results.push(...scanDir(target.dir, target.category, target.label));
  }
  return results;
}

module.exports = { scanJunk };
