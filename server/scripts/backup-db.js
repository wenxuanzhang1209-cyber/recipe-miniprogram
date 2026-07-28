/* eslint-disable no-console */
/**
 * 数据库备份脚本
 * 备份 SQLite 数据库 + 记录完整性信息（SHA256 + 记录数）
 *
 * 用法: node scripts/backup-db.js [备份目录，默认 server/backups]
 * 输出: backups/recipe-YYYYMMDD-HHmmss.sqlite + .meta.json
 *
 * 生产环境(MySQL)应使用 mysqldump，本脚本用于 SQLite 开发/演示环境。
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sequelize, Recipe, User, Favorite, BrowseHistory } = require('../src/models');

function sha256File(fp) {
  const buf = fs.readFileSync(fp);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const backupDir = process.argv[2] || path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  await sequelize.authenticate();

  // 记录备份前记录数
  const counts = {
    recipes: await Recipe.count(),
    users: await User.count(),
    favorites: await Favorite.count(),
    browseHistory: await BrowseHistory.count()
  };

  const dbPath = path.join(__dirname, '..', 'data', 'recipe.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.error('未找到 SQLite 数据库文件:', dbPath);
    process.exit(1);
  }

  const ts = new Date();
  const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
  const backupFile = path.join(backupDir, `recipe-${stamp}.sqlite`);
  const metaFile = `${backupFile}.meta.json`;

  // 复制备份（SQLite 单文件，复制即备份；生产建议先 .backup 命令保证一致性）
  fs.copyFileSync(dbPath, backupFile);

  const meta = {
    backupAt: ts.toISOString(),
    backupFile: path.basename(backupFile),
    sha256: sha256File(backupFile),
    sizeBytes: fs.statSync(backupFile).size,
    recordCounts: counts
  };
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));

  console.log('✅ 备份完成');
  console.log(`   文件: ${backupFile}`);
  console.log(`   SHA256: ${meta.sha256}`);
  console.log(`   记录数: recipes=${counts.recipes}, users=${counts.users}, favorites=${counts.favorites}, history=${counts.browseHistory}`);
  console.log(`   元数据: ${metaFile}`);

  await sequelize.close();
}

main().catch((e) => { console.error('备份失败:', e); process.exit(1); });
