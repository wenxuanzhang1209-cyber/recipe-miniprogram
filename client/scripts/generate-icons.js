/**
 * 图标生成器 — 纯 Node.js 实现，无外部依赖
 * 生成 TabBar 图标（81×81 PNG）及品牌资源
 * 用法: node scripts/generate-icons.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ============ 最小 PNG 编码器 ============
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
  // pixels: Uint8Array RGBA
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    pixels.copy ? pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
      : raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

// ============ 画布与绘图原语 ============
class Canvas {
  constructor(size, supersample = 4) {
    this.ss = supersample;
    this.size = size;
    this.w = size * supersample;
    this.h = size * supersample;
    this.px = Buffer.alloc(this.w * this.h * 4); // 全透明
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

  // 填充圆形
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
        else if (dist <= radius + 0.5) {
          const alpha = Math.round(a * (radius + 0.5 - dist));
          this._blend(x, y, r, g, b, alpha);
        }
      }
    }
  }

  // 填充矩形（支持圆角）
  fillRect(x, y, w, h, color, radius = 0) {
    const s = this.ss;
    const [r, g, b, a] = color;
    const x0 = Math.floor(x * s) - 1, x1 = Math.ceil((x + w) * s) + 1;
    const y0 = Math.floor(y * s) - 1, y1 = Math.ceil((y + h) * s) + 1;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const fx = (px + 0.5) / s, fy = (py + 0.5) / s;
        if (fx < x - 0.5 || fx > x + w + 0.5 || fy < y - 0.5 || fy > y + h + 0.5) continue;
        // 圆角检测
        if (radius > 0) {
          let inside = true;
          let alpha = a;
          const corners = [
            [x + radius, y + radius], [x + w - radius, y + radius],
            [x + radius, y + h - radius], [x + w - radius, y + h - radius]
          ];
          const inCornerZone =
            (fx < x + radius && fy < y + radius) || (fx > x + w - radius && fy < y + radius) ||
            (fx < x + radius && fy > y + h - radius) || (fx > x + w - radius && fy > y + h - radius);
          if (inCornerZone) {
            let minDist = Infinity;
            for (const [cx2, cy2] of corners) {
              const dx = Math.abs(fx - cx2), dy = Math.abs(fy - cy2);
              if ((fx < x + radius ? fx < cx2 : fx > cx2) && (fy < y + radius ? fy < cy2 : fy > cy2)) {
                minDist = Math.min(minDist, Math.sqrt((fx - cx2) ** 2 + (fy - cy2) ** 2));
              }
            }
            if (minDist < Infinity) {
              if (minDist > radius + 0.5) continue;
              if (minDist > radius - 0.5) alpha = Math.round(a * (radius + 0.5 - minDist));
            }
          }
          if (inside) this._blend(px, py, r, g, b, alpha);
        } else {
          // 边缘抗锯齿
          let alpha = a;
          const edgeX = Math.min(fx - (x - 0.5), (x + w + 0.5) - fx);
          const edgeY = Math.min(fy - (y - 0.5), (y + h + 0.5) - fy);
          const edge = Math.min(edgeX, edgeY);
          if (edge < 1) alpha = Math.round(a * Math.max(0, Math.min(1, edge)));
          this._blend(px, py, r, g, b, alpha);
        }
      }
    }
  }

  // 填充三角形
  fillTriangle(x1, y1, x2, y2, x3, y3, color) {
    const s = this.ss;
    const [r, g, b, a] = color;
    const minX = Math.floor(Math.min(x1, x2, x3) * s) - 1;
    const maxX = Math.ceil(Math.max(x1, x2, x3) * s) + 1;
    const minY = Math.floor(Math.min(y1, y2, y3) * s) - 1;
    const maxY = Math.ceil(Math.max(y1, y2, y3) * s) + 1;
    const sign = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const fx = (px + 0.5) / s, fy = (py + 0.5) / s;
        const d1 = sign(fx, fy, x1, y1, x2, y2);
        const d2 = sign(fx, fy, x2, y2, x3, y3);
        const d3 = sign(fx, fy, x3, y3, x1, y1);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        if (!(hasNeg && hasPos)) this._blend(px, py, r, g, b, a);
      }
    }
  }

  // 粗线段（圆头）
  strokeLine(x1, y1, x2, y2, thickness, color) {
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.ceil(len * this.ss * 2);
    const rad = thickness / 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.fillCircle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, rad, color);
    }
  }

  // 降采样输出
  toPNG() {
    const { size, w, ss } = this;
    const out = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < ss; sy++) {
          for (let sx = 0; sx < ss; sx++) {
            const idx = ((y * ss + sy) * w + (x * ss + sx)) * 4;
            r += this.px[idx]; g += this.px[idx + 1]; b += this.px[idx + 2]; a += this.px[idx + 3];
          }
        }
        const n = ss * ss;
        const oi = (y * size + x) * 4;
        out[oi] = Math.round(r / n); out[oi + 1] = Math.round(g / n);
        out[oi + 2] = Math.round(b / n); out[oi + 3] = Math.round(a / n);
      }
    }
    return encodePNG(size, size, out);
  }
}

// ============ 颜色 ============
const GRAY = [156, 163, 175, 255];     // #9CA3AF 普通态
const ORANGE = [255, 107, 53, 255];    // #FF6B35 选中态

// ============ 图标绘制（81×81 逻辑坐标） ============

// 首页：房屋
function drawHome(color) {
  const c = new Canvas(81);
  // 屋顶
  c.fillTriangle(40.5, 12, 10, 40, 71, 40, color);
  // 房体
  c.fillRect(18, 38, 45, 31, color, 3);
  // 门（镂空 → 用透明色覆盖）
  c.fillRect(33, 50, 15, 19, [0, 0, 0, 0], 2);
  // 门用背景透明色不行，改用另一种方式：房体分两块
  return c;
}

function drawHomeV2(color) {
  const c = new Canvas(81);
  // 屋顶（三角形）
  c.fillTriangle(40.5, 11, 8, 41, 73, 41, color);
  // 左墙
  c.fillRect(17, 39, 18, 30, color, 2);
  // 右墙
  c.fillRect(46, 39, 18, 30, color, 2);
  // 门顶
  c.fillRect(35, 39, 11, 8, color, 0);
  // 门（拱形）
  c.fillRect(35, 47, 11, 22, [0, 0, 0, 0], 0);
  c.fillCircle(40.5, 49, 5.5, [0, 0, 0, 0]);
  return c;
}

// 分类：2×2 网格
function drawGrid(color) {
  const c = new Canvas(81);
  const gap = 5, size = 30, start = 10.5;
  c.fillRect(start, start, size, size, color, 7);
  c.fillRect(start + size + gap, start, size, size, color, 7);
  c.fillRect(start, start + size + gap, size, size, color, 7);
  c.fillRect(start + size + gap, start + size + gap, size, size, color, 7);
  return c;
}

// 菜谱：翻开的书
function drawBook(color) {
  const c = new Canvas(81);
  // 左页
  c.fillRect(10, 16, 28, 49, color, 4);
  // 右页
  c.fillRect(43, 16, 28, 49, color, 4);
  // 书脊连接
  c.fillRect(36, 19, 9, 43, color, 0);
  // 左页文字线（镂空）
  const line = [0, 0, 0, 0];
  c.fillRect(16, 26, 16, 3.5, line, 1.5);
  c.fillRect(16, 34, 16, 3.5, line, 1.5);
  c.fillRect(16, 42, 12, 3.5, line, 1.5);
  // 右页文字线
  c.fillRect(49, 26, 16, 3.5, line, 1.5);
  c.fillRect(49, 34, 16, 3.5, line, 1.5);
  c.fillRect(49, 42, 12, 3.5, line, 1.5);
  return c;
}

// 我的：人形
function drawUser(color) {
  const c = new Canvas(81);
  // 头
  c.fillCircle(40.5, 27, 13, color);
  // 身体（半圆肩膀）
  c.fillCircle(40.5, 74, 22, color);
  // 裁掉下半部分 — 用矩形遮住不行，直接让身体为椭圆上半
  // 改用：身体用圆角矩形
  return c;
}

function drawUserV2(color) {
  const c = new Canvas(81);
  // 头部
  c.fillCircle(40.5, 25.5, 12.5, color);
  // 肩部/身体：大圆裁剪 — 画一个大圆然后遮住底部
  c.fillCircle(40.5, 78, 24, color);
  // 底部超出画布自然裁切 (81px)，形成半身像
  return c;
}

// ============ 品牌 Logo（240×240）：圆形底 + 厨师帽轮廓 ============
function drawLogo() {
  const size = 240;
  const c = new Canvas(size, 2);
  // 橙色渐变底 — 用两层圆模拟
  c.fillCircle(120, 120, 112, [255, 107, 53, 255]);
  c.fillCircle(120, 116, 100, [255, 125, 74, 255]);
  // 白色碗
  const white = [255, 255, 255, 255];
  // 碗体（下半圆）
  c.fillCircle(120, 138, 52, white);
  c.fillRect(56, 90, 128, 50, [255, 125, 74, 0], 0); // 清除碗上半
  // 碗口横线
  c.fillRect(64, 130, 112, 8, white, 4);
  // 碗底座
  c.fillRect(100, 186, 40, 8, white, 4);
  // 蒸汽（三条短线）
  c.strokeLine(96, 108, 96, 92, 6, white);
  c.strokeLine(120, 104, 120, 84, 6, white);
  c.strokeLine(144, 108, 144, 92, 6, white);
  // 重新画碗体下半（蒸汽画在了碗位置上方，调整）
  return c;
}

function drawLogoV2() {
  const size = 240;
  const c = new Canvas(size, 2);
  const white = [255, 255, 255, 255];
  // 底色圆
  c.fillCircle(120, 120, 114, [255, 107, 53, 255]);
  // 内圈微亮
  c.fillCircle(120, 118, 102, [255, 118, 66, 255]);
  // 碗（下半圆 + 矩形口）
  c.fillCircle(120, 136, 50, white);
  // 用底色遮住碗的上半部分，形成碗形
  c.fillRect(58, 74, 124, 56, [255, 118, 66, 255], 0);
  // 碗口
  c.fillRect(66, 128, 108, 10, white, 5);
  // 碗足
  c.fillRect(102, 184, 36, 9, white, 4.5);
  // 蒸汽
  c.strokeLine(94, 112, 94, 94, 7, white);
  c.strokeLine(120, 108, 120, 86, 7, white);
  c.strokeLine(146, 112, 146, 94, 7, white);
  return c;
}

// 默认头像（240×240）：浅灰底 + 人形
function drawAvatar() {
  const size = 240;
  const c = new Canvas(size, 2);
  const fg = [255, 255, 255, 255];
  c.fillCircle(120, 120, 114, [224, 228, 232, 255]); // #E0E4E8
  c.fillCircle(120, 95, 38, fg);
  c.fillCircle(120, 228, 62, fg);
  return c;
}

// 空状态插画（240×240）：盘子 + 叉勺
function drawEmpty() {
  const size = 240;
  const c = new Canvas(size, 2);
  const line = [200, 205, 212, 255]; // 浅灰线条
  // 盘子外圈
  const ring = (cx, cy, rOuter, rInner, color) => {
    c.fillCircle(cx, cy, rOuter, color);
    c.fillCircle(cx, cy, rInner, [0, 0, 0, 0]);
  };
  ring(120, 130, 70, 58, line);
  ring(120, 130, 42, 36, [220, 224, 230, 255]);
  // 叉子（左）
  c.strokeLine(38, 60, 38, 130, 6, line);
  c.strokeLine(30, 60, 30, 88, 5, line);
  c.strokeLine(46, 60, 46, 88, 5, line);
  // 勺子（右）
  c.fillCircle(202, 72, 14, line);
  c.fillCircle(202, 72, 8, [0, 0, 0, 0]);
  c.strokeLine(202, 86, 202, 134, 6, line);
  return c;
}

// 分享卡片默认图（500×400）
function drawShareCard() {
  const w = 500, h = 400;
  const c = new Canvas(w, 1);
  // 暖色背景
  c.fillRect(0, 0, w, h, [255, 241, 235, 255], 0);
  // 中心碗图标
  const white = [255, 107, 53, 120];
  c.fillCircle(250, 210, 80, [255, 107, 53, 40]);
  c.fillCircle(250, 220, 50, white);
  c.fillRect(188, 160, 124, 54, [255, 241, 235, 0], 0);
  c.fillRect(196, 214, 108, 9, white, 4);
  // 蒸汽
  c.strokeLine(228, 196, 228, 178, 6, white);
  c.strokeLine(250, 192, 250, 170, 6, white);
  c.strokeLine(272, 196, 272, 178, 6, white);
  return c;
}

// ============ 输出 ============
const outDir = path.join(__dirname, '..', 'images');
fs.mkdirSync(outDir, { recursive: true });

const icons = [
  ['tab-home.png', () => drawHomeV2(GRAY)],
  ['tab-home-active.png', () => drawHomeV2(ORANGE)],
  ['tab-category.png', () => drawGrid(GRAY)],
  ['tab-category-active.png', () => drawGrid(ORANGE)],
  ['tab-browse.png', () => drawBook(GRAY)],
  ['tab-browse-active.png', () => drawBook(ORANGE)],
  ['tab-user.png', () => drawUserV2(GRAY)],
  ['tab-user-active.png', () => drawUserV2(ORANGE)],
  ['logo.png', drawLogoV2],
  ['avatar-default.png', drawAvatar],
  ['empty-state.png', drawEmpty],
  ['share-default.png', drawShareCard],
];

for (const [name, fn] of icons) {
  const canvas = fn();
  const buf = canvas.toPNG();
  const fp = path.join(outDir, name);
  fs.writeFileSync(fp, buf);
  console.log(`✓ ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}
console.log('\n全部图标生成完成 →', outDir);
