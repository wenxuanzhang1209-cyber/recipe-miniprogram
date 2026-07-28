/* eslint-disable no-console */
/**
 * 菜谱封面图策略脚本
 *
 * 背景：现有 10000 道菜全部使用 picsum.photos 随机占位图，与菜名不匹配且每次加载随机变化。
 * 在无法合法获取 10000 张真实菜品照片的前提下，本脚本采取以下可靠策略：
 *   1. 为每个菜系生成一张【确定性】本地占位图（暖色渐变 + 白色碗形图标）
 *   2. 将数据库 cover_image 统一替换为本地小程序资源路径（按菜系映射）
 *   3. 生成一张全局兜底图，供前端图片加载失败时降级
 *
 * 效果：
 *   - 图片不再随机变化（同一菜系图片固定）
 *   - 本地资源，无网络依赖，不会加载失败
 *   - 按菜系分类，不会把无关菜品图错配（至少菜系维度一致）
 *   - 体积小（每张 < 20KB）
 *
 * ⚠️ 上线前仍需替换为真实合法菜品照片（见 docs/IMAGE_SOURCES.md 清单模板）。
 *    本脚本生成的是明确标注的占位图，不是真实菜品照片。
 *
 * 用法: DB_DIALECT=sqlite node scripts/generate-recipe-images.js
 * 安全: 修改数据库前自动备份，并写入变更记录
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const path = require('path');
const { RectCanvas } = require('../../client/scripts/lib/pnglib');
const { sequelize, Recipe } = require('../src/models');

// 菜系 → 文件名 + 主题色 [R,G,B]
const CUISINE_THEMES = {
  川菜: ['chuancai', [231, 76, 60]],
  粤菜: ['yuecai', [243, 156, 18]],
  鲁菜: ['lucai', [141, 110, 99]],
  苏菜: ['sucai', [38, 166, 154]],
  浙菜: ['zhecai', [102, 187, 106]],
  闽菜: ['mincai', [255, 112, 67]],
  湘菜: ['xiangcai', [198, 40, 40]],
  徽菜: ['huicai', [126, 87, 194]],
  家常菜: ['jiachang', [255, 107, 53]],
  东北菜: ['dongbei', [92, 107, 192]],
  西北菜: ['xibei', [212, 160, 23]],
  云贵菜: ['yungui', [0, 137, 123]]
};
const DEFAULT_THEME = ['default', [156, 163, 175]];

const IMG_DIR = path.join(__dirname, '..', '..', 'client', 'images', 'recipes');

/** 绘制一张菜系占位图：暖色渐变 + 白色碗 + 蒸汽 */
function drawCuisineImage(rgb) {
  const W = 400, H = 300;
  const c = new RectCanvas(W, H, 2);
  // 渐变背景（亮 → 深）
  const light = rgb.map((v) => Math.min(255, v + 60));
  c.fillGradient(light, rgb);
  const white = [255, 255, 255, 235];
  const cx = W / 2, cy = H / 2 + 20;
  // 碗体（下半圆）
  c.fillCircle(cx, cy, 70, white);
  // 用背景色遮住碗上半，形成碗形
  c.fillRect(cx - 90, cy - 90, 180, 80, [...rgb, 255]);
  // 碗口
  c.fillRect(cx - 78, cy - 14, 156, 12, white);
  // 碗足
  c.fillRect(cx - 26, cy + 62, 52, 10, white);
  // 蒸汽
  c.strokeLine(cx - 34, cy - 34, cx - 34, cy - 62, 8, [255, 255, 255, 200]);
  c.strokeLine(cx, cy - 40, cx, cy - 74, 8, [255, 255, 255, 200]);
  c.strokeLine(cx + 34, cy - 34, cx + 34, cy - 62, 8, [255, 255, 255, 200]);
  return c.toPNG();
}

async function main() {
  console.log('=== 菜谱封面图策略 ===\n');
  fs.mkdirSync(IMG_DIR, { recursive: true });

  // 1. 生成各菜系占位图 + 兜底图
  const allThemes = { ...CUISINE_THEMES, 其他: DEFAULT_THEME };
  for (const [cuisine, [file, rgb]] of Object.entries(allThemes)) {
    const buf = drawCuisineImage(rgb);
    const fp = path.join(IMG_DIR, `${file}.png`);
    fs.writeFileSync(fp, buf);
    console.log(`✓ ${cuisine} → recipes/${file}.png (${(buf.length / 1024).toFixed(1)} KB)`);
  }
  // 全局兜底图（图片加载失败时用）
  const fallback = drawCuisineImage(DEFAULT_THEME[1]);
  fs.writeFileSync(path.join(IMG_DIR, 'fallback.png'), fallback);
  console.log('✓ 兜底图 → recipes/fallback.png\n');

  // 2. 备份数据库
  await sequelize.authenticate();
  const dbPath = path.join(__dirname, '..', 'data', 'recipe.sqlite');
  if (fs.existsSync(dbPath)) {
    const backup = `${dbPath}.bak-${Date.now()}`;
    fs.copyFileSync(dbPath, backup);
    console.log(`已备份数据库 → ${path.basename(backup)}`);
  }

  // 3. 按菜系更新 cover_image 为本地路径
  console.log('\n更新数据库 cover_image ...');
  const changeLog = [];
  let totalUpdated = 0;
  for (const [cuisine, [file]] of Object.entries(allThemes)) {
    const localPath = `/images/recipes/${file}.png`;
    const [affected] = await Recipe.update(
      { cover_image: localPath },
      { where: { cuisine_type: cuisine } }
    );
    if (affected > 0) {
      changeLog.push({ cuisine_type: cuisine, cover_image: localPath, affected });
      totalUpdated += affected;
      console.log(`  ${cuisine}: ${affected} 条 → ${localPath}`);
    }
  }
  // 未匹配到已知菜系的（其他/空）统一用兜底
  const [rest] = await Recipe.update(
    { cover_image: '/images/recipes/default.png' },
    { where: { cover_image: { [require('sequelize').Op.like]: '%picsum.photos%' } } }
  );
  if (rest > 0) {
    changeLog.push({ cuisine_type: '(其他/未分类)', cover_image: '/images/recipes/default.png', affected: rest });
    totalUpdated += rest;
    console.log(`  其他/未分类: ${rest} 条 → /images/recipes/default.png`);
  }

  // 4. 写变更记录
  const logPath = path.join(__dirname, '..', 'data', 'image-change-log.json');
  fs.writeFileSync(logPath, JSON.stringify({
    changedAt: new Date().toISOString(),
    strategy: '菜系确定性本地占位图（非真实菜品照片，上线前需替换）',
    totalUpdated,
    changes: changeLog
  }, null, 2));

  // 验证
  const remaining = await Recipe.count({ where: { cover_image: { [require('sequelize').Op.like]: '%picsum.photos%' } } });
  console.log(`\n共更新 ${totalUpdated} 条，剩余 picsum 占位图: ${remaining}`);
  console.log(`变更记录 → ${logPath}`);

  await sequelize.close();
}

main().catch((e) => { console.error('执行失败:', e); process.exit(1); });
