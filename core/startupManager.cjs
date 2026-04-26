const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();

// ── macOS ──────────────────────────────────────────────────────────────────

function parsePlist(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
    const disabledMatch = content.match(/<key>Disabled<\/key>\s*<(true|false)\/>/);
    return {
      name: labelMatch ? labelMatch[1] : path.basename(filePath, '.plist'),
      path: filePath,
      enabled: !disabledMatch || disabledMatch[1] === 'false',
      type: 'launch-agent',
    };
  } catch {
    return null;
  }
}

function getMacStartupItems() {
  const dirs = [
    { dir: path.join(HOME, 'Library', 'LaunchAgents'), type: 'launch-agent' },
    { dir: '/Library/LaunchAgents', type: 'launch-agent' },
    { dir: '/Library/LaunchDaemons', type: 'launch-daemon' },
  ];
  const items = [];
  for (const { dir, type } of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.plist'));
      for (const f of files) {
        const parsed = parsePlist(path.join(dir, f));
        if (parsed) { parsed.type = type; items.push(parsed); }
      }
    } catch { /* skip */ }
  }
  return items;
}

function toggleMacStartupItem(item, enabled) {
  try {
    const cmd = enabled
      ? `launchctl load "${item.path}"`
      : `launchctl unload "${item.path}"`;
    execSync(cmd, { timeout: 5000 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Windows ────────────────────────────────────────────────────────────────

function getWinStartupItems() {
  const items = [];
  try {
    const out = execSync(
      'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"',
      { encoding: 'utf8', timeout: 8000 }
    );
    const lines = out.split('\n').filter(l => l.includes('REG_SZ'));
    for (const line of lines) {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        items.push({
          name: parts[0],
          path: parts[2],
          enabled: true,
          type: 'registry-user',
        });
      }
    }
  } catch { /* skip */ }

  // Startup folder
  const startupFolder = path.join(
    process.env.APPDATA || '',
    'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
  );
  if (fs.existsSync(startupFolder)) {
    try {
      const files = fs.readdirSync(startupFolder);
      for (const f of files) {
        items.push({
          name: path.basename(f, path.extname(f)),
          path: path.join(startupFolder, f),
          enabled: true,
          type: 'startup-folder',
        });
      }
    } catch { /* skip */ }
  }
  return items;
}

function toggleWinStartupItem(item, enabled) {
  try {
    if (item.type === 'registry-user') {
      if (!enabled) {
        execSync(`reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${item.name}" /f`, { timeout: 5000 });
      }
      return { ok: true };
    }
    if (item.type === 'startup-folder' && !enabled) {
      fs.unlinkSync(item.path);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Exports ────────────────────────────────────────────────────────────────

async function getStartupItems() {
  return process.platform === 'win32' ? getWinStartupItems() : getMacStartupItems();
}

async function toggleStartupItem(item, enabled) {
  return process.platform === 'win32'
    ? toggleWinStartupItem(item, enabled)
    : toggleMacStartupItem(item, enabled);
}

module.exports = { getStartupItems, toggleStartupItem };
