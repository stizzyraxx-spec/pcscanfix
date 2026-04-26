const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const SCAN_DIRS = process.platform === 'win32'
  ? [
      path.join(HOME, 'Documents'),
      path.join(HOME, 'Downloads'),
      path.join(HOME, 'Desktop'),
      path.join(HOME, 'Pictures'),
      path.join(HOME, 'Videos'),
    ]
  : [
      path.join(HOME, 'Documents'),
      path.join(HOME, 'Downloads'),
      path.join(HOME, 'Desktop'),
      path.join(HOME, 'Pictures'),
      path.join(HOME, 'Movies'),
      path.join(HOME, 'Music'),
    ];

const THRESHOLD = 100 * 1024 * 1024; // 100 MB

function collectLarge(dir, results, depth = 0) {
  if (depth > 5) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      try {
        if (e.isFile()) {
          const stat = fs.statSync(full);
          if (stat.size >= THRESHOLD) {
            results.push({
              path: full,
              name: e.name,
              size: stat.size,
              modified: stat.mtimeMs,
              ext: path.extname(e.name).toLowerCase(),
            });
          }
        } else if (e.isDirectory()) {
          collectLarge(full, results, depth + 1);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

async function scanLargeFiles() {
  const results = [];
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) collectLarge(dir, results);
  }
  return results.sort((a, b) => b.size - a.size);
}

module.exports = { scanLargeFiles };
