const { Tray, Menu, nativeImage, app } = require('electron');
const os = require('os');
const { execSync } = require('child_process');
const zlib = require('zlib');

let tray = null;
let interval = null;
let _win = null;
let _onScan = null;

function makePNG(r, g, b) {
  const size = 16;
  const rowLen = size * 4;
  const raw = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowLen + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (rowLen + 1) + 1 + x * 4;
      const inShield = (y >= 2 && y <= 9 && x >= 2 && x <= 13) ||
        (y >= 10 && y <= 13 && x >= (y - 6) && x <= (19 - (y - 6)));
      raw[i] = inShield ? r : 0;
      raw[i + 1] = inShield ? g : 0;
      raw[i + 2] = inShield ? b : 0;
      raw[i + 3] = inShield ? 255 : 0;
    }
  }
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
      const free = parseInt((out.match(/FreeSpace=(\d+)/) || [])[1] || '0');
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

function iconColor(diskPct) {
  if (diskPct > 85) return [239, 68, 68];
  if (diskPct > 65) return [245, 158, 11];
  return [99, 102, 241];
}

function rebuild() {
  if (!tray) return;
  const diskPct = getDiskPct();
  const memPct = getMemPct();
  const [r, g, b] = iconColor(diskPct);
  const img = nativeImage.createFromBuffer(makePNG(r, g, b));
  tray.setImage(img);
  tray.setToolTip(`PCFixScan  •  Disk: ${diskPct}%  •  RAM: ${memPct}%`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'PCFixScan', enabled: false },
    { type: 'separator' },
    { label: 'Open', click: () => { _win?.show(); _win?.focus(); } },
    { label: 'Quick Scan', click: () => { _win?.show(); _win?.focus(); _win?.webContents.send('navigate', '/scanner'); _onScan?.(); } },
    { type: 'separator' },
    { label: `Disk: ${diskPct}% used`, enabled: false },
    { label: `RAM: ${memPct}% used`, enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
}

function createTray(win, onScanTrigger) {
  _win = win;
  _onScan = onScanTrigger;
  const img = nativeImage.createFromBuffer(makePNG(99, 102, 241));
  tray = new Tray(img);
  tray.on('click', () => { _win?.show(); _win?.focus(); });
  rebuild();
  interval = setInterval(rebuild, 30_000);
}

function destroyTray() {
  clearInterval(interval);
  tray?.destroy();
  tray = null;
}

module.exports = { createTray, destroyTray };
