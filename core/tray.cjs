const { Tray, Menu, nativeImage, app } = require('electron');
const os = require('os');
const { execSync } = require('child_process');
const zlib = require('zlib');

let tray = null;
let interval = null;
let _win = null;
let _onScan = null;

// ─── Tray icon: monochrome monitor silhouette, macOS template image ──────────
// Drawn at 22x22 (1x) — macOS will auto-scale + invert in dark mode.
// Template means: only alpha matters; macOS picks black or white based on theme.
function makeTrayPNG(size = 22) {
  const rowLen = size * 4;
  const raw = Buffer.alloc((rowLen + 1) * size);

  // Scale coords from a 22-grid to whatever size is requested
  const scale = size / 22;
  const px = (x, y) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = y * (rowLen + 1) + 1 + x * 4;
    raw[i]     = 0;       // R
    raw[i + 1] = 0;       // G
    raw[i + 2] = 0;       // B
    raw[i + 3] = 255;     // alpha (template img — color is ignored)
  };
  const rect = (x1, y1, x2, y2) => {
    for (let y = Math.round(y1); y < Math.round(y2); y++)
      for (let x = Math.round(x1); x < Math.round(x2); x++) px(x, y);
  };
  const s = v => v * scale;

  // Initialize all rows with the filter byte (0 = no filter)
  for (let y = 0; y < size; y++) raw[y * (rowLen + 1)] = 0;

  // Monitor body — outer rectangle (rounded look via clipped corners)
  rect(s(2),  s(3),  s(20), s(15));
  // Carve out the screen — set alpha=0 (gap inside the bezel)
  for (let y = Math.round(s(5)); y < Math.round(s(13)); y++) {
    for (let x = Math.round(s(4)); x < Math.round(s(18)); x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const i = y * (rowLen + 1) + 1 + x * 4;
      raw[i + 3] = 0;
    }
  }
  // Stand neck
  rect(s(9.5), s(15), s(12.5), s(17));
  // Base
  rect(s(6),  s(17), s(16), s(19));

  const deflated = zlib.deflateSync(raw);

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const byte of buf) { c ^= byte; for (let i = 0; i < 8; i++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function getDiskPct() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get size,freespace /value', { encoding: 'utf8', timeout: 3000 });
      const free  = parseInt((out.match(/FreeSpace=(\d+)/) || [])[1] || '0');
      const total = parseInt((out.match(/Size=(\d+)/) || [])[1] || '1');
      return Math.round((1 - free / total) * 100);
    }
    const out = execSync("df -k / | tail -1 | awk '{print $5}'", { encoding: 'utf8', timeout: 3000 }).trim();
    return parseInt(out.replace('%', '')) || 0;
  } catch { return 0; }
}

function getMemPct() {
  return Math.round((1 - os.freemem() / os.totalmem()) * 100);
}

function buildIcon() {
  // Provide @1x (22) + @2x (44) for retina
  const img1x = nativeImage.createFromBuffer(makeTrayPNG(22));
  const img2x = nativeImage.createFromBuffer(makeTrayPNG(44));
  // Combine into a single multi-rep image
  img1x.addRepresentation({ scaleFactor: 2.0, buffer: makeTrayPNG(44) });
  img1x.setTemplateImage(true); // macOS auto handles dark/light mode
  return img1x;
}

function rebuild() {
  if (!tray) return;
  const diskPct = getDiskPct();
  const memPct  = getMemPct();
  tray.setToolTip(`PCFixScan  •  Disk: ${diskPct}%  •  RAM: ${memPct}%`);

  const showWindow = () => {
    if (process.platform === 'darwin') app.dock?.show();
    _win?.show();
    _win?.focus();
  };

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'PCFixScan — running in background', enabled: false },
    { type: 'separator' },
    { label: 'Open', click: showWindow },
    { label: 'Quick Scan', click: () => { showWindow(); _win?.webContents.send('navigate', '/scanner'); _onScan?.(); } },
    { label: 'Run background scan now', click: () => {
        try {
          const autoScan = require('./autoScan.cjs');
          autoScan.runOnce(_win);
        } catch (err) { console.error('[tray scan now]', err); }
      }
    },
    { type: 'separator' },
    { label: `Disk: ${diskPct}% used`, enabled: false },
    { label: `RAM: ${memPct}% used`, enabled: false },
    { type: 'separator' },
    { label: 'Quit PCFixScan', click: () => app.quit() },
  ]));
}

function createTray(win, onScanTrigger) {
  _win = win;
  _onScan = onScanTrigger;
  tray = new Tray(buildIcon());
  tray.on('click', () => { _win?.show(); _win?.focus(); });
  rebuild();
  // Refresh menu (disk/RAM stats) every 30s — icon stays static template
  interval = setInterval(rebuild, 30_000);
}

function destroyTray() {
  clearInterval(interval);
  tray?.destroy();
  tray = null;
}

module.exports = { createTray, destroyTray };
