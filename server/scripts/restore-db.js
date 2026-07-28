/* eslint-disable no-console */
/**
 * 数据库恢复脚本
 * 从备份恢复 SQLite 数据库 + 校验完整性（SHA256 + 记录数）
 *
 * 用法: node scripts/restore-db.js <备份文件路径>
 * 安全: 恢复前自动备份当前库（防止误操作），恢复后校验 SHA256 和记录数
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256File(fp) {
  const buf = fs.readFileSync(fp);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('用法: node scripts/restore-db.js <备份文件路径>');
    process.exit(1);
  }
  if (!fs.existsSync(backupFile)) {
    console.error('备份文件不存在:', backupFile);
    process.exit(1);
  }

  const dbPath = path.join(__dirname, '..', 'data', 'recipe.sqlite');
  const metaFile = `${backupFile}.meta.json`;
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : null;

  // 1. 恢复前备份当前库（防误操作）
  if (fs.existsSync(dbPath)) {
    const preRestoreBackup = `${dbPath}.pre-restore-${Date.now()}`;
    fs.copyFileSync(dbPath, preRestoreBackup);
    console.log(`已备份当前库 → ${path.basename(preRestoreBackup)}`);
  }

  // 2. 执行恢复
  fs.copyFileSync(backupFile, dbPath);
  console.log(`已恢复: ${backupFile} → recipe.sqlite`);

  // 3. 校验 SHA256
  const restoredHash = sha256File(dbPath);
  if (meta && meta.sha256) {
    const match = restoredHash === meta.sha256;
    console.log(`SHA256 校验: ${match ? '✅ 一致' : '❌ 不一致!'}`);
    if (!match) {
      console.error(`  期望: ${meta.sha256}`);
      console.error(`  实际: ${restoredHash}`);
      process.exit(1);
    }
  }

  // 4. 校验记录数
  const { sequelize, Recipe } = require('../src/models');
  await sequelize.authenticate();
  const count = await Recipe.count();
  console.log(`恢复后菜谱数: ${count}`);
  if (meta && meta.recordCounts && meta.recordCounts.recipes !== count) {
    console.error(`❌ 记录数不一致! 期望 ${meta.recordCounts.recipes}, 实际 ${count}`);
    process.exit(1);
  }
  console.log('✅ 恢复完成并校验通过');

  await sequelize.close();
}

main().catch((e) => { console.error('恢复失败:', e); process.exit(1); });
