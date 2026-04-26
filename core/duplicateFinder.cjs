const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const HOME = os.homedir();
const SCAN_DIRS = process.platform === 'win32'
  ? [
      path.join(HOME, 'Documents'),
      path.join(HOME, 'Downloads'),
      path.join(HOME, 'Pictures'),
      path.join(HOME, 'Music'),
      path.join(HOME, 'Videos'),
    ]
  : [
      path.join(HOME, 'Documents'),
      path.join(HOME, 'Downloads'),
      path.join(HOME, 'Pictures'),
      path.join(HOME, 'Movies'),
      path.join(HOME, 'Music'),
      path.join(HOME, 'Desktop'),
    ];

const MIN_SIZE = 1024 * 10; // skip files < 10KB to reduce false positives

function hashFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function collectFiles(dir, depth = 0) {
  const files = [];
  if (depth > 4) return files;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      try {
        if (e.isFile()) {
          const stat = fs.statSync(full);
          if (stat.size >= MIN_SIZE) files.push({ path: full, size: stat.size });
        } else if (e.isDirectory()) {
          files.push(...collectFiles(full, depth + 1));
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return files;
}

async function scanDuplicates() {
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) allFiles.push(...collectFiles(dir));
  }

  // Group by size first (fast pre-filter)
  const bySizeMap = new Map();
  for (const f of allFiles) {
    const key = f.size;
    if (!bySizeMap.has(key)) bySizeMap.set(key, []);
    bySizeMap.get(key).push(f);
  }

  const groups = [];
  for (const [, sameSize] of bySizeMap) {
    if (sameSize.length < 2) continue;
    const byHash = new Map();
    for (const f of sameSize) {
      const h = hashFile(f.path);
      if (!h) continue;
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push(f.path);
    }
    for (const [hash, files] of byHash) {
      if (files.length >= 2) {
        groups.push({ hash, size: sameSize[0].size, files });
      }
    }
  }
  return groups;
}

module.exports = { scanDuplicates };
