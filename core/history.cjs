const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

function historyPath() {
  return path.join(app.getPath('userData'), 'scan-history.json');
}

function read() {
  try { return JSON.parse(fs.readFileSync(historyPath(), 'utf8')) || []; }
  catch { return []; }
}

function write(data) {
  fs.writeFileSync(historyPath(), JSON.stringify(data.slice(0, 500), null, 2));
}

function saveScanEntry(categories, results) {
  const found = {
    junk: results.junk?.length || 0,
    browsers: results.browsers?.length || 0,
    duplicates: results.duplicates?.length || 0,
    largeFiles: results.largeFiles?.length || 0,
    malware: results.malware?.length || 0,
  };
  const totalSize = [...(results.junk || []), ...(results.browsers || [])].reduce((s, f) => s + (f.size || 0), 0);
  const history = read();
  history.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    type: 'scan',
    categories,
    found,
    totalItems: Object.values(found).reduce((a, b) => a + b, 0),
    totalSize,
  });
  write(history);
}

function saveCleanEntry(itemsCleaned, bytesFreed) {
  const history = read();
  history.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    type: 'clean',
    itemsCleaned,
    bytesFreed,
  });
  write(history);
}

function getHistory() { return read(); }

function getStats() {
  const history = read();
  const cleans = history.filter(h => h.type === 'clean');
  const scans = history.filter(h => h.type === 'scan');
  return {
    totalScans: scans.length,
    totalCleans: cleans.length,
    totalBytesFreed: cleans.reduce((s, c) => s + (c.bytesFreed || 0), 0),
    totalItemsCleaned: cleans.reduce((s, c) => s + (c.itemsCleaned || 0), 0),
    lastScan: scans[0]?.date || null,
  };
}

module.exports = { saveScanEntry, saveCleanEntry, getHistory, getStats };
