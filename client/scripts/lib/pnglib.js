/**
 * lib/pnglib.js — 纯 Node.js PNG 编码器 + 绘图原语（无外部依赖）
 * 供 generate-icons.js / generate-recipe-images.js 复用
 */
const zlib = require('zlib');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    if (pixels.copy) pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
    else raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

/** 矩形画布（支持超采样抗锯齿） */
class RectCanvas {
  constructor(width, height, supersample = 2) {
    this.ss = supersample;
    this.width = width;
    this.height = height;
    this.w = width * supersample;
    this.h = height * supersample;
    this.px = Buffer.alloc(this.w * this.h * 4);
  }

  _blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const idx = (y * this.w + x) * 4;
    const sa = a / 255;
    const da = this.px[idx + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa === 0) return;
    this.px[idx] = Math.round((r * sa + this.px[idx] * da * (1 - sa)) / oa);
    this.px[idx + 1] = Math.round((g * sa + this.px[idx + 1] * da * (1 - sa)) / oa);
    this.px[idx + 2] = Math.round((b * sa + this.px[idx + 2] * da * (1 - sa)) / oa);
    this.px[idx + 3] = Math.round(oa * 255);
  }

  fillCircle(cx, cy, radius, color) {
    const s = this.ss;
    const [r, g, b, a] = color;
    const x0 = Math.floor((cx - radius) * s) - 1, x1 = Math.ceil((cx + radius) * s) + 1;
    const y0 = Math.floor((cy - radius) * s) - 1, y1 = Math.ceil((cy + radius) * s) + 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5) / s - cx, dy = (y + 0.5) / s - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius - 0.5) this._blend(x, y, r, g, b, a);
        else if (dist <= radius + 0.5) this._blend(x, y, r, g, b, Math.round(a * (radius + 0.5 - dist)));
      }
    }
  }

  fillRect(x, y, w, h, color) {
    const s = this.ss;
    const [r, g, b, a] = color;
    const x0 = Math.max(0, Math.floor(x * s)), x1 = Math.min(this.w - 1, Math.ceil((x + w) * s));
    const y0 = Math.max(0, Math.floor(y * s)), y1 = Math.min(this.h - 1, Math.ceil((y + h) * s));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) this._blend(px, py, r, g, b, a);
    }
  }

  // 垂直渐变背景
  fillGradient(c1, c2) {
    const s = this.ss;
    for (let y = 0; y < this.h; y++) {
      const t = y / this.h;
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      for (let x = 0; x < this.w; x++) this._blend(x, y, r, g, b, 255);
    }
  }

  strokeLine(x1, y1, x2, y2, thickness, color) {
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.ceil(len * this.ss * 2);
    const rad = thickness / 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.fillCircle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, rad, color);
    }
  }

  toPNG() {
    const { width, height, w, ss } = this;
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < ss; sy++) {
          for (let sx = 0; sx < ss; sx++) {
            const idx = ((y * ss + sy) * w + (x * ss + sx)) * 4;
            r += this.px[idx]; g += this.px[idx + 1]; b += this.px[idx + 2]; a += this.px[idx + 3];
          }
        }
        const n = ss * ss;
        const oi = (y * width + x) * 4;
        out[oi] = Math.round(r / n); out[oi + 1] = Math.round(g / n);
        out[oi + 2] = Math.round(b / n); out[oi + 3] = Math.round(a / n);
      }
    }
    return encodePNG(width, height, out);
  }
}

module.exports = { encodePNG, RectCanvas };
