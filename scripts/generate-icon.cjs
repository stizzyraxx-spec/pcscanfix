// Generates build/icon.png (512x512), build/icon.ico, and public/og-image.png
// Icon matches the TopNav SVG computer logo exactly
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── PNG encoder ─────────────────────────────────────────────────────────────
function encodePNGRect(pixels, w, h) {
  const rowLen = w * 4;
  const raw = Buffer.alloc((rowLen + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (rowLen + 1)] = 0;
    pixels.copy(raw, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen);
  }
  const deflated = zlib.deflateSync(raw);
  function crc32(b) {
    let c = 0xFFFFFFFF;
    for (const byte of b) { c ^= byte; for (let i = 0; i < 8; i++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing primitives ───────────────────────────────────────────────────────
function makeCanvas(w, h) {
  const buf = Buffer.alloc(w * h * 4, 0);
  function px(x, y, r, g, b) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
  }
  function rect(x1, y1, x2, y2, r, g, b) {
    x1=Math.round(x1); y1=Math.round(y1); x2=Math.round(x2); y2=Math.round(y2);
    for (let y = y1; y < y2; y++)
      for (let x = x1; x < x2; x++) px(x, y, r, g, b);
  }
  function rrect(x1, y1, x2, y2, rad, r, g, b) {
    x1=Math.round(x1); y1=Math.round(y1); x2=Math.round(x2); y2=Math.round(y2);
    rad = Math.round(rad);
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        if      (x < x1+rad && y < y1+rad) { const dx=x-(x1+rad), dy=y-(y1+rad); if (dx*dx+dy*dy > rad*rad) continue; }
        else if (x >= x2-rad && y < y1+rad) { const dx=x-(x2-rad-1), dy=y-(y1+rad); if (dx*dx+dy*dy > rad*rad) continue; }
        else if (x < x1+rad && y >= y2-rad) { const dx=x-(x1+rad), dy=y-(y2-rad-1); if (dx*dx+dy*dy > rad*rad) continue; }
        else if (x >= x2-rad && y >= y2-rad) { const dx=x-(x2-rad-1), dy=y-(y2-rad-1); if (dx*dx+dy*dy > rad*rad) continue; }
        px(x, y, r, g, b);
      }
    }
  }
  function circle(cx, cy, rad, r, g, b) {
    cx=Math.round(cx); cy=Math.round(cy); rad=Math.round(rad);
    for (let y = cy-rad; y <= cy+rad; y++)
      for (let x = cx-rad; x <= cx+rad; x++)
        if ((x-cx)**2 + (y-cy)**2 <= rad*rad) px(x, y, r, g, b);
  }
  return { buf, rect, rrect, circle };
}

// ─── Render TopNav SVG logo at a given scale + offset ─────────────────────────
// Source SVG viewBox: 0 0 24 24
function renderLogo(canvas, scale, ox, oy) {
  const { rect, rrect, circle } = canvas;
  const f = x => x * scale + ox;
  const g = y => y * scale + oy;
  const s = v => v * scale;

  // Monitor body — #D4D0C8
  rrect(f(1), g(2), f(23), g(16), s(1.5), 212, 208, 200);

  // Top-edge highlight — #EEE8E0 at 0.8 opacity blended over #D4D0C8
  rrect(f(2), g(2.5), f(22), g(3.5), s(0.5), 233, 227, 219);

  // Screen — #001628
  rect(f(3), g(4), f(21), g(14), 0, 22, 40);

  // Text line 1 — #00DC3C at 0.9 opacity
  rect(f(4.5), g(6), f(17.5), g(7.2), 0, 200, 57);

  // Text line 2
  rect(f(4.5), g(9.5), f(14.5), g(10.7), 0, 200, 57);

  // Cursor block
  rect(f(15.5), g(9.5), f(17), g(10.7), 0, 220, 60);

  // Power LED — #00F050
  circle(f(20.5), g(15), s(0.9), 0, 240, 80);

  // Stand neck — #B8B4AE
  rect(f(10), g(16), f(14), g(19.5), 184, 180, 174);

  // Base — #C4C0BA
  rrect(f(7), g(19.5), f(17), g(21.5), s(0.5), 196, 192, 186);
}

// ─── 512×512 app icon ────────────────────────────────────────────────────────
const SIZE = 512;
const icon = makeCanvas(SIZE, SIZE);

// Rounded blue background (#0078D4)
icon.rrect(0, 0, SIZE, SIZE, 76, 0, 120, 212);

// Logo centered: SVG center ≈ (12, 11.75), canvas center = 256
const SCALE = 20;
const OX = 256 - 12 * SCALE;      // 16
const OY = 256 - 11.75 * SCALE;   // 21
renderLogo(icon, SCALE, OX, OY);

const iconPng = encodePNGRect(icon.buf, SIZE, SIZE);

// ─── 1200×630 OG social preview ───────────────────────────────────────────────
const OG_W = 1200, OG_H = 630;
const og = makeCanvas(OG_W, OG_H);

// Blue background
og.rect(0, 0, OG_W, OG_H, 0, 120, 212);

// Subtle darker panel behind logo
og.rrect(OG_W/2 - 260, OG_H/2 - 220, OG_W/2 + 260, OG_H/2 + 220, 32, 0, 96, 180);

// Logo at scale=28, centered
const OG_SCALE = 28;
const OG_OX = OG_W/2 - 12 * OG_SCALE;
const OG_OY = OG_H/2 - 11.75 * OG_SCALE;
renderLogo(og, OG_SCALE, OG_OX, OG_OY);

const ogPng = encodePNGRect(og.buf, OG_W, OG_H);

// ─── Write files ─────────────────────────────────────────────────────────────
const buildDir  = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(buildDir,  { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(buildDir,  'icon.png'), iconPng);
console.log('✓ build/icon.png (512×512)');

fs.copyFileSync(path.join(buildDir, 'icon.png'), path.join(publicDir, 'icon.png'));
console.log('✓ public/icon.png');

fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogPng);
console.log('✓ public/og-image.png (1200×630)');

// ICO (Vista+ embedded PNG)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
const imgOffset = 6 + 16;
const dirEntry = Buffer.alloc(16);
dirEntry[0] = 0; dirEntry[1] = 0; dirEntry[2] = 0; dirEntry[3] = 0;
dirEntry.writeUInt16LE(1, 4);
dirEntry.writeUInt16LE(32, 6);
dirEntry.writeUInt32LE(iconPng.length, 8);
dirEntry.writeUInt32LE(imgOffset, 12);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), Buffer.concat([icoHeader, dirEntry, iconPng]));
console.log('✓ build/icon.ico');
