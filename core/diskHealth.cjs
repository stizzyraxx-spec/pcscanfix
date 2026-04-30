const { execFile } = require('child_process');
const os = require('os');

function execAsync(cmd, args, timeout = 8000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      resolve(err ? '' : stdout);
    });
  });
}

async function macDisk() {
  // diskutil info -plist /  → big plist; we use simple key/val flag instead.
  const info = await execAsync('/usr/sbin/diskutil', ['info', '/']);
  const get = (key) => {
    const m = info.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const ssd = get('Solid State') === 'Yes';
  const trim = get('TRIM Support') || get('Disk / Partition UUID') ? get('TRIM Support') : null;

  // smartctl is rarely installed by default; skip and use macOS's own SMART status.
  const smart = get('SMART Status') || 'Unknown';
  const protocol = get('Protocol');
  const device = get('Device / Media Name') || get('Device Identifier');

  return {
    platform: 'mac',
    device,
    ssd,
    protocol,
    trim: trim || (ssd ? 'Enabled (default on macOS)' : 'N/A'),
    health: smart,
    raw: { source: 'diskutil info /' },
  };
}

async function winDisk() {
  // Get-PhysicalDisk gives the modern combined view. Falls back to wmic if PS missing.
  const ps = `Get-PhysicalDisk | Select-Object FriendlyName,MediaType,HealthStatus,OperationalStatus,Size,SpindleSpeed | ConvertTo-Json -Compress`;
  const out = await execAsync('powershell.exe', ['-NoProfile', '-Command', ps], 10000);
  if (out) {
    try {
      const parsed = JSON.parse(out);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      // Identify the system disk (best effort: first SSD/HDD reported)
      const primary = arr[0];
      const isSsd = (primary?.MediaType || '').toLowerCase().includes('ssd');
      return {
        platform: 'win',
        device: primary?.FriendlyName || 'Unknown',
        ssd: isSsd,
        protocol: null,
        trim: isSsd ? 'Managed by Windows (defrag.exe -L)' : 'N/A',
        health: primary?.HealthStatus || 'Unknown',
        all: arr,
      };
    } catch { /* fallthrough */ }
  }
  // Fallback via wmic
  const wmic = await execAsync('wmic.exe', ['diskdrive', 'get', 'Model,Status,Size,MediaType', '/format:list']);
  return {
    platform: 'win',
    device: (wmic.match(/Model=(.+)/) || [])[1]?.trim() || 'Unknown',
    ssd: /SSD/i.test(wmic),
    protocol: null,
    trim: /SSD/i.test(wmic) ? 'Managed by Windows' : 'N/A',
    health: (wmic.match(/Status=(.+)/) || [])[1]?.trim() || 'Unknown',
  };
}

async function getDiskHealth() {
  try {
    return process.platform === 'win32' ? await winDisk() : await macDisk();
  } catch (err) {
    return { platform: process.platform, error: err.message };
  }
}

// Read-only TRIM/defrag analyze. Never runs `defrag /D` — only the analyze pass.
// Why: defrag on SSD is harmful, and even on HDD we want explicit user opt-in.
async function analyzeDefrag() {
  if (process.platform !== 'win32') {
    return { supported: false, reason: 'macOS handles fragmentation automatically.' };
  }
  // /A = analyze only, /V = verbose
  const out = await execAsync('defrag.exe', ['C:', '/A', '/V'], 60000);
  return { supported: true, output: out.trim() };
}

module.exports = { getDiskHealth, analyzeDefrag };
