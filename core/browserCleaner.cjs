const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const LOCAL = process.env.LOCALAPPDATA || '';
const ROAMING = process.env.APPDATA || '';

function buildTargets() {
  if (process.platform === 'win32') {
    return [
      { browser: 'Chrome', path: path.join(LOCAL, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'), type: 'cache' },
      { browser: 'Chrome', path: path.join(LOCAL, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'), type: 'cache' },
      { browser: 'Edge', path: path.join(LOCAL, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'), type: 'cache' },
      { browser: 'Edge', path: path.join(LOCAL, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'), type: 'cache' },
      { browser: 'Opera', path: path.join(ROAMING, 'Opera Software', 'Opera Stable', 'Cache'), type: 'cache' },
      { browser: 'Brave', path: path.join(LOCAL, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache'), type: 'cache' },
    ];
  } else {
    return [
      { browser: 'Chrome', path: path.join(HOME, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cache'), type: 'cache' },
      { browser: 'Chrome', path: path.join(HOME, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Code Cache'), type: 'cache' },
      { browser: 'Chrome', path: path.join(HOME, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'GPUCache'), type: 'cache' },
      { browser: 'Edge', path: path.join(HOME, 'Library', 'Application Support', 'Microsoft Edge', 'Default', 'Cache'), type: 'cache' },
      { browser: 'Safari', path: path.join(HOME, 'Library', 'Caches', 'com.apple.Safari'), type: 'cache' },
      { browser: 'Safari', path: path.join(HOME, 'Library', 'Safari', 'LocalStorage'), type: 'storage' },
      { browser: 'Brave', path: path.join(HOME, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser', 'Default', 'Cache'), type: 'cache' },
      { browser: 'Opera', path: path.join(HOME, 'Library', 'Application Support', 'com.operasoftware.Opera', 'Default', 'Cache'), type: 'cache' },
    ];
  }
}

function dirSize(dirPath) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dirPath, e.name);
      try {
        if (e.isFile()) total += fs.statSync(full).size;
        else if (e.isDirectory()) total += dirSize(full);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return total;
}

function collectFiles(dirPath) {
  const files = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dirPath, e.name);
      try {
        if (e.isFile()) files.push(full);
        else if (e.isDirectory()) files.push(...collectFiles(full));
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return files;
}

async function scanBrowsers() {
  const targets = buildTargets();
  const results = [];
  for (const t of targets) {
    if (!fs.existsSync(t.path)) continue;
    const size = dirSize(t.path);
    if (size === 0) continue;
    const files = collectFiles(t.path);
    results.push({
      path: t.path,
      name: `${t.browser} ${t.type}`,
      size,
      browser: t.browser,
      type: t.type,
      files,
      isDirectory: true,
    });
  }
  return results;
}

module.exports = { scanBrowsers };
