const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();
const LOCAL = process.env.LOCALAPPDATA || '';
const ROAMING = process.env.APPDATA || '';

// ── macOS ─────────────────────────────────────────────────────────────────

function parsePlist(plistPath) {
  try {
    const json = execSync(`plutil -convert json -o - "${plistPath}"`, { encoding: 'utf8', timeout: 3000 });
    const d = JSON.parse(json);
    return {
      bundleId: d.CFBundleIdentifier || '',
      name: d.CFBundleName || d.CFBundleDisplayName || '',
      version: d.CFBundleShortVersionString || d.CFBundleVersion || '',
    };
  } catch { return null; }
}

function dirSize(p) {
  try { return parseInt(execSync(`du -sk "${p}"`, { encoding: 'utf8', timeout: 5000 }).split('\t')[0]) * 1024; }
  catch { return 0; }
}

// Generic terms that appear as bundle ID segments but shouldn't be used for matching
const GENERIC_BUNDLE_PARTS = new Set(['app', 'mac', 'osx', 'ios', 'com', 'net', 'org', 'co', 'client', 'helper', 'agent', 'daemon', 'service', 'plugin', 'ext']);

function findMacLeftovers(name, bundleId) {
  const dirs = [
    path.join(HOME, 'Library', 'Application Support'),
    path.join(HOME, 'Library', 'Preferences'),
    path.join(HOME, 'Library', 'Caches'),
    path.join(HOME, 'Library', 'Logs'),
    path.join(HOME, 'Library', 'Containers'),
    path.join(HOME, 'Library', 'Group Containers'),
    path.join(HOME, 'Library', 'Saved Application State'),
  ];
  const results = [];
  const nameLower = name.toLowerCase();
  const nameNoSpaces = nameLower.replace(/\s+/g, '');
  const bundleLower = bundleId.toLowerCase();
  // Only use the last bundle segment (app-specific, not company), e.g. "chrome" from "com.google.Chrome"
  const segments = bundleLower.split('.');
  const appSegment = segments[segments.length - 1] || '';
  const useAppSegment = appSegment.length >= 4 && !GENERIC_BUNDLE_PARTS.has(appSegment);

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      for (const entry of fs.readdirSync(dir)) {
        const el = entry.toLowerCase();
        const isMatch = (
          el === bundleLower ||                          // exact bundle ID
          el.startsWith(bundleLower) ||                  // starts with bundle ID (e.g. plist)
          el.includes(nameLower) ||                      // contains full app name
          el.includes(nameNoSpaces) ||                   // name without spaces
          (useAppSegment && el.includes(appSegment))     // app-specific bundle segment
        );
        if (isMatch) {
          const full = path.join(dir, entry);
          results.push({ path: full, name: entry, size: dirSize(full) });
        }
      }
    } catch { /* skip */ }
  }
  return results;
}

function getMacApps() {
  const apps = [];
  for (const dir of ['/Applications', path.join(HOME, 'Applications')]) {
    if (!fs.existsSync(dir)) continue;
    try {
      for (const entry of fs.readdirSync(dir).filter(e => e.endsWith('.app'))) {
        const appPath = path.join(dir, entry);
        const info = parsePlist(path.join(appPath, 'Contents', 'Info.plist'));
        if (!info) continue;
        apps.push({
          name: info.name || entry.replace('.app', ''),
          path: appPath,
          version: info.version,
          bundleId: info.bundleId,
          size: 0,
        });
      }
    } catch { /* skip */ }
  }
  return apps;
}

// ── Windows ───────────────────────────────────────────────────────────────

function getWinApps() {
  const apps = [];
  const keys = [
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];
  for (const key of keys) {
    try {
      const subKeys = execSync(`reg query "${key}"`, { encoding: 'utf8', timeout: 5000 })
        .trim().split('\n').map(l => l.trim()).filter(Boolean);
      for (const sub of subKeys) {
        try {
          const info = execSync(`reg query "${sub}" /v DisplayName /v DisplayVersion /v UninstallString /v EstimatedSize`, { encoding: 'utf8', timeout: 3000 });
          const nm = (info.match(/DisplayName\s+REG_SZ\s+(.+)/) || [])[1]?.trim();
          if (!nm) continue;
          apps.push({
            name: nm,
            version: (info.match(/DisplayVersion\s+REG_SZ\s+(.+)/) || [])[1]?.trim() || '',
            uninstallString: (info.match(/UninstallString\s+REG_SZ\s+(.+)/) || [])[1]?.trim() || '',
            size: parseInt((info.match(/EstimatedSize\s+REG_DWORD\s+(.+)/) || [])[1] || '0', 16) * 1024,
            path: sub,
          });
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  const seen = new Set();
  return apps.filter(a => { if (seen.has(a.name)) return false; seen.add(a.name); return true; });
}

function findWinLeftovers(name) {
  const first = name.split(' ')[0].toLowerCase();
  const results = [];
  for (const loc of [ROAMING, LOCAL, 'C:\\ProgramData']) {
    if (!loc || !fs.existsSync(loc)) continue;
    try {
      for (const entry of fs.readdirSync(loc)) {
        if (entry.toLowerCase().includes(first)) {
          results.push({ path: path.join(loc, entry), name: entry, size: 0 });
        }
      }
    } catch { /* skip */ }
  }
  return results;
}

// ── Exports ───────────────────────────────────────────────────────────────

async function getInstalledApps() {
  return process.platform === 'win32' ? getWinApps() : getMacApps();
}

async function getAppLeftovers(app) {
  return process.platform === 'win32'
    ? findWinLeftovers(app.name)
    : findMacLeftovers(app.name, app.bundleId || '');
}

async function getAppSize(appPath) {
  return dirSize(appPath);
}

async function uninstallApp(appInfo, leftoverPaths, shell) {
  if (process.platform === 'win32') {
    if (appInfo.uninstallString) {
      try { execSync(`start /wait "" ${appInfo.uninstallString}`, { timeout: 60000 }); } catch { /* user cancelled */ }
    }
  } else {
    try { await shell.trashItem(appInfo.path); } catch { /* skip */ }
  }
  for (const p of leftoverPaths) {
    try { await shell.trashItem(p); } catch {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* skip */ }
    }
  }
  return { ok: true };
}

module.exports = { getInstalledApps, getAppLeftovers, getAppSize, uninstallApp };
