const { app } = require('electron');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const HOME = os.homedir();

// Paths under any of these are NEVER touched, regardless of what a scanner returned.
// Why: a single bad path in a delete batch would be unrecoverable on macOS sandbox or
// catastrophic on Windows; the whitelist is the last line of defense.
const PROTECTED_PREFIXES = process.platform === 'win32'
  ? [
      'C:\\Windows\\System32',
      'C:\\Windows\\SysWOW64',
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      'C:\\Users\\Default',
      'C:\\$Recycle.Bin',
      'C:\\Boot',
      'C:\\Recovery',
      'C:\\System Volume Information',
    ]
  : [
      '/System',
      '/usr',
      '/bin',
      '/sbin',
      '/Library/Apple',
      '/Library/Frameworks',
      '/Applications',
      path.join(HOME, 'Library', 'Keychains'),
      path.join(HOME, 'Library', 'Mail'),
      path.join(HOME, 'Library', 'Messages'),
      path.join(HOME, 'Documents'),
      path.join(HOME, 'Desktop'),
      path.join(HOME, 'Pictures'),
      path.join(HOME, 'Movies'),
      path.join(HOME, 'Music'),
    ];

// Allow narrower deletes within otherwise-protected user dirs (e.g. user-selected large files).
// Caller must opt in by passing { trustUserSelection: true }.
function isProtected(p, opts = {}) {
  if (!p || typeof p !== 'string') return true;
  const norm = process.platform === 'win32' ? p.toLowerCase() : p;
  for (const prefix of PROTECTED_PREFIXES) {
    const cmp = process.platform === 'win32' ? prefix.toLowerCase() : prefix;
    if (norm === cmp || norm.startsWith(cmp + path.sep)) {
      // User-selected large files inside Documents/Desktop/etc are allowed only with the flag.
      if (opts.trustUserSelection && norm.startsWith(HOME)) {
        // System paths under home (Keychains/Mail/Messages) stay protected even with the flag.
        const userDataProtected = ['Keychains', 'Mail', 'Messages']
          .some(d => norm.includes(path.join(HOME, 'Library', d)));
        if (!userDataProtected) continue;
      }
      return true;
    }
  }
  return false;
}

function partitionByProtection(paths, opts = {}) {
  const safe = [];
  const blocked = [];
  for (const p of paths) (isProtected(p, opts) ? blocked : safe).push(p);
  return { safe, blocked };
}

function snapshotPath() {
  return path.join(app.getPath('userData'), 'undo-manifest.json');
}

function readSnapshot() {
  try { return JSON.parse(fs.readFileSync(snapshotPath(), 'utf8')); }
  catch { return { entries: [] }; }
}

function writeSnapshot(data) {
  try { fs.writeFileSync(snapshotPath(), JSON.stringify(data, null, 2)); } catch {}
}

// Record a delete batch so the user can see what was removed and request a Trash restore.
// We don't copy file contents (that would defeat the cleanup) — we log the original paths
// + Trash mode, and rely on the OS Trash for actual recovery.
function recordDeletion({ source, mode, items }) {
  const snap = readSnapshot();
  snap.entries.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source,
    mode,
    items: items.map(i => ({ path: i.path || i, size: i.size || 0 })),
  });
  // Cap at 50 batches to keep the manifest small.
  snap.entries = snap.entries.slice(0, 50);
  writeSnapshot(snap);
}

function listDeletions() {
  return readSnapshot().entries;
}

function clearDeletions() {
  writeSnapshot({ entries: [] });
}

module.exports = {
  isProtected,
  partitionByProtection,
  recordDeletion,
  listDeletions,
  clearDeletions,
  PROTECTED_PREFIXES,
};
