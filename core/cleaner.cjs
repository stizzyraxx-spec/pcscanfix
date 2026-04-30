const { shell, app } = require('electron');
const fs   = require('fs');
const path = require('path');
const { partitionByProtection, recordDeletion } = require('./safety.cjs');

function readSettings() {
  try {
    const f = path.join(app.getPath('userData'), 'settings.json');
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return {}; }
}

async function cleanFiles(paths, opts = {}) {
  const settings = readSettings();
  // Default: Trash (recoverable). User must explicitly opt into permanent delete in Settings.
  const trashMode = settings.trashMode !== false;

  const results = { success: 0, failed: 0, blocked: 0, errors: [], blockedPaths: [] };

  // Safety gate: protected system paths are never touched. trustUserSelection lets the
  // caller (e.g., large-file cleanup) bypass user-dir protection but never system dirs.
  const { safe, blocked } = partitionByProtection(paths, {
    trustUserSelection: opts.trustUserSelection === true,
  });
  results.blocked = blocked.length;
  results.blockedPaths = blocked;

  const cleared = [];
  for (const p of safe) {
    let size = 0;
    try { size = fs.statSync(p).size; } catch {}

    if (trashMode) {
      try {
        await shell.trashItem(p);
        results.success++;
        cleared.push({ path: p, size });
      } catch (err) {
        results.failed++;
        results.errors.push({ path: p, error: `trashItem failed: ${err.message}` });
      }
    } else {
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
        else                    fs.unlinkSync(p);
        results.success++;
        cleared.push({ path: p, size });
      } catch (err) {
        results.failed++;
        results.errors.push({ path: p, error: err.message });
      }
    }
  }

  if (cleared.length) {
    recordDeletion({
      source: opts.source || 'cleaner',
      mode: trashMode ? 'trash' : 'permanent',
      items: cleared,
    });
  }

  return results;
}

module.exports = { cleanFiles };
