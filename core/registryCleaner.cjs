const { app } = require('electron');
const fs   = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Windows-only. Returns empty data on macOS so the UI can render an "unsupported" state
// without conditional imports at the IPC layer.
const isWin = process.platform === 'win32';

function execAsync(cmd, args, timeout = 8000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: stdout || '', stderr: stderr || '', err });
    });
  });
}

const RUN_KEYS = [
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
];

const UNINSTALL_KEYS = [
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
];

// Resolve env vars in a registry value (e.g. %ProgramFiles%\App\app.exe → C:\Program Files\App\app.exe)
function expandEnv(value) {
  if (!value) return value;
  return value.replace(/%([^%]+)%/g, (_, name) => process.env[name] || `%${name}%`);
}

// Strip surrounding quotes from a command line so we can stat the executable.
function commandTarget(value) {
  if (!value) return null;
  const expanded = expandEnv(value).trim();
  if (expanded.startsWith('"')) {
    const end = expanded.indexOf('"', 1);
    if (end > 0) return expanded.slice(1, end);
  }
  // Otherwise take the first token before a space.
  const first = expanded.split(/\s+/)[0];
  return first;
}

async function listValues(key) {
  // `reg query` output is "    NAME    REG_SZ    VALUE"
  const r = await execAsync('reg.exe', ['query', key]);
  if (!r.ok) return [];
  const out = [];
  for (const line of r.stdout.split(/\r?\n/)) {
    const m = line.match(/^\s{4}(\S.*?)\s+(REG_\w+)\s+(.*)$/);
    if (m) out.push({ name: m[1].trim(), type: m[2], value: m[3].trim() });
  }
  return out;
}

async function listSubkeys(key) {
  const r = await execAsync('reg.exe', ['query', key]);
  if (!r.ok) return [];
  const out = [];
  for (const line of r.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith(key) && trimmed.length > key.length) out.push(trimmed);
  }
  return out;
}

async function scanStartupOrphans() {
  if (!isWin) return [];
  const orphans = [];
  for (const key of RUN_KEYS) {
    const values = await listValues(key);
    for (const v of values) {
      const target = commandTarget(v.value);
      if (!target) continue;
      // If the target file doesn't exist, the Run entry is orphaned.
      try {
        if (!fs.existsSync(target)) {
          orphans.push({ kind: 'startup-orphan', key, name: v.name, value: v.value, target, risk: 'safe' });
        }
      } catch { /* skip */ }
    }
  }
  return orphans;
}

async function scanUninstallOrphans() {
  if (!isWin) return [];
  const orphans = [];
  for (const root of UNINSTALL_KEYS) {
    const subkeys = await listSubkeys(root);
    for (const sub of subkeys) {
      const values = await listValues(sub);
      const installLoc = values.find(v => v.name === 'InstallLocation')?.value;
      const display    = values.find(v => v.name === 'DisplayName')?.value;
      const uninstall  = values.find(v => v.name === 'UninstallString')?.value;
      // An uninstall entry is orphaned if InstallLocation exists but is gone, OR
      // UninstallString points to an executable that's gone.
      let isOrphan = false; let reason = '';
      if (installLoc) {
        const expanded = expandEnv(installLoc.replace(/^"|"$/g, ''));
        try { if (!fs.existsSync(expanded)) { isOrphan = true; reason = 'InstallLocation missing'; } }
        catch {}
      } else if (uninstall) {
        const target = commandTarget(uninstall);
        try { if (target && !fs.existsSync(target)) { isOrphan = true; reason = 'UninstallString missing'; } }
        catch {}
      }
      if (isOrphan) {
        orphans.push({
          kind: 'uninstall-orphan',
          key: sub,
          name: display || path.basename(sub),
          reason,
          risk: 'review',
        });
      }
    }
  }
  return orphans;
}

async function scanRegistry() {
  if (!isWin) return { supported: false, items: [] };
  const [a, b] = await Promise.all([scanStartupOrphans(), scanUninstallOrphans()]);
  return { supported: true, items: [...a, ...b] };
}

async function backupKey(key, backupDir) {
  // Use `reg export` to write a .reg file before any delete. Without a successful
  // backup we refuse to delete, so a botched cleanup is always recoverable.
  const safe = key.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 60);
  const file = path.join(backupDir, `${Date.now()}_${safe}.reg`);
  const r = await execAsync('reg.exe', ['export', key, file, '/y']);
  return r.ok ? file : null;
}

async function deleteValue(key, name, backupDir) {
  const backup = await backupKey(key, backupDir);
  if (!backup) return { ok: false, error: 'backup failed; refusing to delete' };
  const r = await execAsync('reg.exe', ['delete', key, '/v', name, '/f']);
  return { ok: r.ok, backup, error: r.ok ? null : r.stderr.trim() };
}

async function deleteKey(key, backupDir) {
  // Back up the parent (one level up) so the entire subkey tree is recoverable.
  const parent = key.split('\\').slice(0, -1).join('\\');
  const backup = await backupKey(parent || key, backupDir);
  if (!backup) return { ok: false, error: 'backup failed; refusing to delete' };
  const r = await execAsync('reg.exe', ['delete', key, '/f']);
  return { ok: r.ok, backup, error: r.ok ? null : r.stderr.trim() };
}

async function cleanRegistry(items) {
  if (!isWin) return { supported: false, success: 0, failed: 0, errors: [], backups: [] };
  const backupDir = path.join(app.getPath('userData'), 'reg-backups');
  try { fs.mkdirSync(backupDir, { recursive: true }); } catch {}

  const result = { supported: true, success: 0, failed: 0, errors: [], backups: [] };
  for (const it of items) {
    let r;
    if (it.kind === 'startup-orphan') r = await deleteValue(it.key, it.name, backupDir);
    else                              r = await deleteKey(it.key, backupDir);

    if (r.ok) {
      result.success++;
      if (r.backup) result.backups.push(r.backup);
    } else {
      result.failed++;
      result.errors.push({ key: it.key, error: r.error });
    }
  }
  return result;
}

async function restoreBackup(backupFile) {
  if (!isWin) return { ok: false, error: 'unsupported' };
  if (!fs.existsSync(backupFile)) return { ok: false, error: 'backup file not found' };
  const r = await execAsync('reg.exe', ['import', backupFile]);
  return { ok: r.ok, error: r.ok ? null : r.stderr.trim() };
}

function listBackups() {
  if (!isWin) return [];
  const dir = path.join(app.getPath('userData'), 'reg-backups');
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.reg'))
      .map(f => ({ file: path.join(dir, f), name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch { return []; }
}

module.exports = { scanRegistry, cleanRegistry, restoreBackup, listBackups };
