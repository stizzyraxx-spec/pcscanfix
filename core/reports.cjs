const { app, BrowserWindow, dialog } = require('electron');
const fs   = require('fs');
const path = require('path');
const { getHistory, getStats } = require('./history.cjs');

function fmtBytes(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportCSV() {
  const history = getHistory();
  const rows = [['Date', 'Type', 'Categories', 'Items', 'Size']];
  for (const h of history) {
    rows.push([
      h.date || '',
      h.type || '',
      Array.isArray(h.categories) ? h.categories.join('|') : '',
      h.itemCount ?? h.count ?? '',
      h.totalBytes != null ? fmtBytes(h.totalBytes) : '',
    ]);
  }

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export PCFixScan history (CSV)',
    defaultPath: `pcfixscan-history-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (canceled || !filePath) return { canceled: true };

  const text = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  fs.writeFileSync(filePath, text);
  return { ok: true, path: filePath };
}

function buildHTML(history, stats) {
  const rows = history.map(h => `
    <tr>
      <td>${new Date(h.date || Date.now()).toLocaleString()}</td>
      <td>${h.type || ''}</td>
      <td>${Array.isArray(h.categories) ? h.categories.join(', ') : ''}</td>
      <td style="text-align:right">${h.itemCount ?? h.count ?? ''}</td>
      <td style="text-align:right">${h.totalBytes != null ? fmtBytes(h.totalBytes) : ''}</td>
    </tr>
  `).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>PCFixScan Report</title>
  <style>
    body { font-family: -apple-system, Segoe UI, sans-serif; padding: 32px; color: #111; }
    h1 { margin: 0 0 4px 0; }
    .muted { color: #666; font-size: 12px; }
    .stats { display: flex; gap: 24px; margin: 24px 0; }
    .stat { flex: 1; padding: 16px; background: #f4f6f9; border-radius: 8px; }
    .stat .label { color: #666; font-size: 12px; }
    .stat .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e3e6ec; text-align: left; }
    th { background: #f4f6f9; font-weight: 600; }
  </style></head><body>
    <h1>PCFixScan Report</h1>
    <div class="muted">Generated ${new Date().toLocaleString()}</div>
    <div class="stats">
      <div class="stat"><div class="label">Total scans</div><div class="value">${stats.totalScans || 0}</div></div>
      <div class="stat"><div class="label">Total cleans</div><div class="value">${stats.totalCleans || 0}</div></div>
      <div class="stat"><div class="label">Bytes freed</div><div class="value">${fmtBytes(stats.totalBytesFreed || 0)}</div></div>
    </div>
    <h2>History</h2>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Categories</th><th>Items</th><th>Size</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="muted">No history yet.</td></tr>'}</tbody>
    </table>
  </body></html>`;
}

async function exportPDF() {
  const history = getHistory();
  const stats   = getStats();

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export PCFixScan report (PDF)',
    defaultPath: `pcfixscan-report-${new Date().toISOString().slice(0, 10)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { canceled: true };

  // Render HTML in a hidden window, print to PDF, then close it.
  // No extra dep — Electron's printToPDF is built in.
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  try {
    const html = buildHTML(history, stats);
    const tmp = path.join(app.getPath('temp'), `pcfixscan-report-${Date.now()}.html`);
    fs.writeFileSync(tmp, html);
    await win.loadFile(tmp);
    const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'Letter' });
    fs.writeFileSync(filePath, pdf);
    try { fs.unlinkSync(tmp); } catch {}
    return { ok: true, path: filePath };
  } finally {
    win.destroy();
  }
}

module.exports = { exportCSV, exportPDF };
