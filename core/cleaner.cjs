const { shell } = require('electron');
const fs = require('fs');

async function cleanFiles(paths) {
  const results = { success: 0, failed: 0, errors: [] };

  for (const p of paths) {
    try {
      // Move to trash — recoverable, safe default
      await shell.trashItem(p);
      results.success++;
    } catch (err) {
      // Fallback: direct delete for files that can't be trashed (temp paths, etc.)
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          fs.rmSync(p, { recursive: true, force: true });
        } else {
          fs.unlinkSync(p);
        }
        results.success++;
      } catch (err2) {
        results.failed++;
        results.errors.push({ path: p, error: err2.message });
      }
    }
  }

  return results;
}

module.exports = { cleanFiles };
