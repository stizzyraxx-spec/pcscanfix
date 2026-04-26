// Generates build/icon.png (512x512) — run with: node scripts/generate-icon.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;

function makePNG(pixels) {
  const rowLen = SIZE * 4;
  const raw = Buffer.alloc((rowLen + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    raw[y * (rowLen + 1)] = 0;
    pixels.copy(raw, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen);
  }
  const deflated = zlib.deflateSync(raw);

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inShield(x, y) {
  const cx = SIZE / 2, cy = SIZE / 2;
  const sx = (x - cx) / (SIZE * 0.40);
  const sy = (y - cy) / (SIZE * 0.46);
  if (sy < -1 || sy > 1.05) return false;
  // Rounded rectangle top
  if (sy <= 0.35) {
    if (Math.abs(sx) > 1) return false;
    if (sy < -0.75 && Math.abs(sx) > 0.72) {
      const dx = Math.abs(sx) - 0.72, dy = sy + 0.75;
      return Math.sqrt(dx * dx + dy * dy) <= 0.28;
    }
    return true;
  }
  // Tapered bottom to point
  const t = (sy - 0.35) / 0.7;
  return Math.abs(sx) <= 1 - t;
}

function inCheck(x, y) {
  const cx = SIZE / 2, cy = SIZE * 0.48;
  const nx = (x - cx) / (SIZE * 0.22);
  const ny = (y - cy) / (SIZE * 0.22);
  const thick = 0.28;
  // Left arm: slope down-left to center
  const lx = nx + 0.65, ly = ny - 0.2;
  const proj = lx * 0.707 + ly * 0.707;
  const perp = Math.abs(-lx * 0.707 + ly * 0.707);
  const inLeft = proj >= 0 && proj <= 0.9 && perp <= thick && nx <= 0;
  // Right arm: slope up-right from center
  const rx = nx, ry = ny;
  const proj2 = rx * 0.55 - ry * 0.835;
  const perp2 = Math.abs(rx * 0.835 + ry * 0.55);
  const inRight = proj2 >= 0 && proj2 <= 1.5 && perp2 <= thick && nx >= -0.1;
  return inLeft || inRight;
}

const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;
    if (!inShield(x, y)) { pixels[idx + 3] = 0; continue; }
    // Indigo → purple gradient top to bottom
    const t = y / SIZE;
    const r = Math.round(99 + (139 - 99) * t);
    const g = Math.round(102 + (92 - 102) * t);
    const b = Math.round(241 + (246 - 241) * t);
    // Subtle inner glow on left edge
    const cx = SIZE / 2;
    const glow = Math.max(0, 1 - Math.abs(x - cx * 0.65) / (SIZE * 0.25)) * 0.18;
    pixels[idx]     = Math.min(255, Math.round(r + (255 - r) * glow));
    pixels[idx + 1] = Math.min(255, Math.round(g + (255 - g) * glow));
    pixels[idx + 2] = Math.min(255, Math.round(b + (255 - b) * glow));
    pixels[idx + 3] = 255;
    // White checkmark overlay
    if (inCheck(x, y)) {
      pixels[idx]     = 255;
      pixels[idx + 1] = 255;
      pixels[idx + 2] = 255;
      pixels[idx + 3] = 240;
    }
  }
}

const outPath = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, makePNG(pixels));
console.log('✓ Icon generated:', outPath);
