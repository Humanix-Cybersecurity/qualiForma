// SPDX-License-Identifier: AGPL-3.0-or-later
// Génère les icônes PWA de marque (PNG sans dépendance). Usage : node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BRAND = [29, 78, 216];   // #1d4ed8
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c, table = crc32.t || (crc32.t = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
    return t;
  })());
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return ~crc >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// distance from point to segment AB
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function smooth(edge, d) { // 1 inside, 0 outside, AA over 1px
  return Math.max(0, Math.min(1, edge - d + 0.5));
}

function makeIcon(N) {
  const buf = Buffer.alloc(N * N * 4);
  const stroke = N * 0.085;
  // checkmark vertices (within safe zone ~80%)
  const p = (f) => f * N;
  const A = [p(0.30), p(0.52)];
  const B = [p(0.44), p(0.66)];
  const C = [p(0.72), p(0.34)];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      // full-bleed brand background (maskable-safe)
      buf[i] = BRAND[0]; buf[i + 1] = BRAND[1]; buf[i + 2] = BRAND[2]; buf[i + 3] = 255;
      const d = Math.min(distSeg(x, y, A[0], A[1], B[0], B[1]), distSeg(x, y, B[0], B[1], C[0], C[1]));
      const a = smooth(stroke, d);
      if (a > 0) {
        buf[i] = Math.round(BRAND[0] + (WHITE[0] - BRAND[0]) * a);
        buf[i + 1] = Math.round(BRAND[1] + (WHITE[1] - BRAND[1]) * a);
        buf[i + 2] = Math.round(BRAND[2] + (WHITE[2] - BRAND[2]) * a);
      }
    }
  }
  return png(N, N, buf);
}

writeFileSync('public/icon-192.png', makeIcon(192));
writeFileSync('public/icon-512.png', makeIcon(512));
writeFileSync('public/apple-touch-icon.png', makeIcon(180));
console.log('icons written');
