import { deflateSync } from 'node:zlib';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'public', 'icons');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const TRANSPARENT = [0, 0, 0, 0];
const BG = [71, 100, 215, 255];
const BORDER = [71, 100, 215, 255];
const FG = [255, 255, 255, 255];
const FG2 = [255, 255, 255, 255];

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const outer = Math.max(1, Math.round(size * 0.125));
  const border = Math.max(1, Math.round(size / 64));
  const radius = Math.max(2, Math.round(size * 0.16));
  const innerLeft = outer + border;
  const innerTop = outer + border;
  const innerRight = size - outer - border - 1;
  const innerBottom = size - outer - border - 1;
  const bars = [0.36, 0.6, 0.84];
  const contentMargin = Math.round(size * 0.23);
  const gap = Math.max(1, Math.round(size * 0.075));
  const barW = Math.max(2, Math.round((size - contentMargin * 2 - gap * 2) / 3));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = TRANSPARENT;
      const inOuter = insideRoundedRect(x, y, outer, outer, size - outer - 1, size - outer - 1, radius);
      const inInner = insideRoundedRect(x, y, innerLeft, innerTop, innerRight, innerBottom, Math.max(1, radius - border));
      if (inOuter) c = inInner ? BG : BORDER;

      for (let b = 0; b < 3; b++) {
        const bx = contentMargin + b * (barW + gap);
        const base = size - contentMargin;
        const byTop = base - bars[b] * (size - contentMargin * 2);
        if (inInner && x >= bx && x < bx + barW && y >= byTop && y <= base) {
          c = b === 2 ? FG2 : FG;
        }
      }

      const i = (y * size + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = c[3];
    }
  }
  return encodePng(size, size, px);
}

mkdirSync(outDir, { recursive: true });
for (const s of [16, 48, 128]) {
  const output = join(outDir, `icon${s}.png`);
  writeFileSync(output, drawIcon(s));
  console.log(`icon${s}.png written`);
  if (s === 128) {
    for (const targetDir of [join(root, '..', 'store', 'assets'), join(root, '..', 'site', 'assets')]) {
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(output, join(targetDir, 'icon-128.png'));
    }
  }
}
