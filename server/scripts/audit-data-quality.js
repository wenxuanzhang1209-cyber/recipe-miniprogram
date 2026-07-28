/* eslint-disable no-console */
/**
 * 数据质量审计脚本
 * 对现有菜谱库做全量质量检查，输出报告并为每条菜谱生成质量状态
 *
 * 用法: DB_DIALECT=sqlite node scripts/audit-data-quality.js
 * 输出: server/data/quality-report.json + 控制台摘要
 *
 * 只读审计，不修改数据。修复请基于报告另行处理（保留备份）。
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const path = require('path');
const {
  sequelize, Recipe, Ingredient, RecipeIngredient, RecipeStep, NutritionalInfo
} = require('../src/models');

// 合理值域（用于检测异常）
const VALID_CUISINES = ['川菜', '粤菜', '鲁菜', '苏菜', '浙菜', '闽菜', '湘菜', '徽菜', '家常菜', '东北菜', '西北菜', '云贵菜', '其他'];
const HTML_PATTERN = /<\s*(script|iframe|img|a|div|span|svg)\b|javascript:/i;

const issues = {
  duplicateName: [],
  emptyField: [],
  missingSteps: [],
  stepOrderError: [],
  duplicateIngredient: [],
  abnormalAmount: [],
  abnormalTime: [],
  abnormalDifficulty: [],
  overlongField: [],
  htmlContent: [],
  unbelievableNutrition: [],
  abnormalCount: [],
  placeholderImage: [],
  missingImage: []
};

const recipeQuality = new Map(); // id -> { issues: [], score }

function addIssue(type, recipeId, recipeName, detail) {
  issues[type].push({ id: recipeId, name: recipeName, detail });
  if (!recipeQuality.has(recipeId)) recipeQuality.set(recipeId, { issues: [] });
  recipeQuality.get(recipeId).issues.push(`${type}: ${detail}`);
}

async function audit() {
  console.log('=== 菜谱数据质量审计 ===\n');
  const total = await Recipe.count();
  console.log(`菜谱总数: ${total}\n`);

  // ---------- 1. 菜名重复 ----------
  const [dupNames] = await sequelize.query(
    'SELECT name, COUNT(*) as cnt FROM recipes GROUP BY name HAVING cnt > 1 ORDER BY cnt DESC LIMIT 50',
    { type: sequelize.QueryTypes.SELECT }
  ).then((r) => [r]);
  dupNames.forEach((d) => addIssue('duplicateName', null, d.name, `重复 ${d.cnt} 次`));

  // ---------- 2. 逐条检查 ----------
  const pageSize = 500;
  for (let offset = 0; offset < total; offset += pageSize) {
    const recipes = await Recipe.findAll({
      offset, limit: pageSize, order: [['id', 'ASC']], raw: true
    });

    for (const r of recipes) {
      // 空字段
      ['name', 'cuisine_type', 'taste', 'cooking_method', 'description'].forEach((f) => {
        if (!r[f] || !String(r[f]).trim()) addIssue('emptyField', r.id, r.name, `字段 ${f} 为空`);
      });

      // 菜系不在合法集合
      if (r.cuisine_type && !VALID_CUISINES.includes(r.cuisine_type)) {
        addIssue('emptyField', r.id, r.name, `菜系 "${r.cuisine_type}" 不在标准集合`);
      }

      // 难度异常
      if (r.difficulty < 1 || r.difficulty > 5) {
        addIssue('abnormalDifficulty', r.id, r.name, `难度 ${r.difficulty} 超出 1-5`);
      }

      // 时间异常
      if (r.prep_time < 0 || r.prep_time > 180) addIssue('abnormalTime', r.id, r.name, `prep_time=${r.prep_time}`);
      if (r.cook_time < 0 || r.cook_time > 480) addIssue('abnormalTime', r.id, r.name, `cook_time=${r.cook_time}`);

      // 超长字段
      if (r.name && r.name.length > 50) addIssue('overlongField', r.id, r.name, `菜名 ${r.name.length} 字符`);
      if (r.description && r.description.length > 1000) addIssue('overlongField', r.id, r.name, `描述 ${r.description.length} 字符`);

      // HTML/脚本字符
      [r.name, r.description, r.tips].forEach((f) => {
        if (f && HTML_PATTERN.test(f)) addIssue('htmlContent', r.id, r.name, '含HTML/脚本字符');
      });

      // 图片
      if (!r.cover_image || !String(r.cover_image).trim()) {
        addIssue('missingImage', r.id, r.name, '缺少封面图');
      } else if (/picsum\.photos|placeholder|via\.placeholder|lorempixel/i.test(r.cover_image)) {
        addIssue('placeholderImage', r.id, r.name, `占位图: ${r.cover_image.slice(0, 60)}`);
      }

      // 浏览/收藏数异常
      if (r.view_count < 0 || r.favorite_count < 0) addIssue('abnormalCount', r.id, r.name, '负数计数');
      if (r.favorite_count > r.view_count && r.view_count > 0) {
        addIssue('abnormalCount', r.id, r.name, `收藏(${r.favorite_count})>浏览(${r.view_count})`);
      }
    }
  }

  // ---------- 3. 步骤检查 ----------
  console.log('检查步骤完整性...');
  const noStepRecipes = await sequelize.query(
    'SELECT r.id, r.name FROM recipes r LEFT JOIN recipe_steps s ON r.id = s.recipe_id WHERE s.id IS NULL',
    { type: sequelize.QueryTypes.SELECT }
  );
  noStepRecipes.forEach((r) => addIssue('missingSteps', r.id, r.name, '无任何步骤'));

  // 步骤顺序不连续（有缺口）
  const stepGap = await sequelize.query(
    `SELECT recipe_id, COUNT(*) as cnt, MAX(step_number) as maxn FROM recipe_steps
     GROUP BY recipe_id HAVING maxn > cnt LIMIT 100`,
    { type: sequelize.QueryTypes.SELECT }
  );
  stepGap.forEach((g) => addIssue('stepOrderError', g.recipe_id, null, `步骤数${g.cnt}但最大序号${g.maxn}（有空号）`));

  // ---------- 4. 食材检查 ----------
  console.log('检查食材关联...');
  const noIngRecipes = await sequelize.query(
    'SELECT r.id, r.name FROM recipes r LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id WHERE ri.id IS NULL',
    { type: sequelize.QueryTypes.SELECT }
  );
  noIngRecipes.forEach((r) => addIssue('duplicateIngredient', r.id, r.name, '无任何食材'));

  // 同一菜谱重复食材
  const dupIng = await sequelize.query(
    `SELECT recipe_id, ingredient_id, COUNT(*) as cnt FROM recipe_ingredients
     GROUP BY recipe_id, ingredient_id HAVING cnt > 1 LIMIT 100`,
    { type: sequelize.QueryTypes.SELECT }
  );
  dupIng.forEach((d) => addIssue('duplicateIngredient', d.recipe_id, null, `食材ID ${d.ingredient_id} 重复${d.cnt}次`));

  // 用量异常（超长或含特殊字符）
  const badAmounts = await sequelize.query(
    `SELECT ri.recipe_id, ri.amount FROM recipe_ingredients ri
     WHERE length(ri.amount) > 20 OR ri.amount GLOB '*<*' LIMIT 100`,
    { type: sequelize.QueryTypes.SELECT }
  );
  badAmounts.forEach((a) => addIssue('abnormalAmount', a.recipe_id, null, `用量 "${a.amount}"`));

  // ---------- 5. 营养数据可信度 ----------
  console.log('检查营养数据...');
  const badNutrition = await NutritionalInfo.findAll({
    include: [{ model: Recipe, as: 'nutrition', attributes: [] }],
    raw: true
  }).catch(() => []);
  // 直接查表
  const nutritionRows = await sequelize.query(
    `SELECT n.recipe_id, n.calories, n.protein, n.fat, n.carbs FROM nutritional_infos n
     WHERE n.calories < 0 OR n.calories > 2000 OR n.protein < 0 OR n.protein > 200
        OR n.fat < 0 OR n.fat > 200 OR n.carbs < 0 OR n.carbs > 500 LIMIT 200`,
    { type: sequelize.QueryTypes.SELECT }
  ).catch(() => []);
  nutritionRows.forEach((n) => addIssue('unbelievableNutrition', n.recipe_id, null,
    `热量${n.calories}/蛋白${n.protein}/脂肪${n.fat}/碳水${n.carbs} 超出合理范围`));

  // ---------- 汇总 ----------
  console.log('\n=== 审计结果摘要 ===');
  let totalIssues = 0;
  Object.entries(issues).forEach(([type, list]) => {
    console.log(`  ${type}: ${list.length}`);
    totalIssues += list.length;
  });
  console.log(`\n问题总计: ${totalIssues}`);
  console.log(`涉及菜谱数: ${recipeQuality.size}`);

  // 每条菜谱质量评分（100 - 每问题扣10，最低0）
  const qualityList = [];
  for (const [id, q] of recipeQuality.entries()) {
    const score = Math.max(0, 100 - q.issues.length * 10);
    qualityList.push({ recipe_id: id, score, issues: q.issues });
  }

  // 图片问题统计（占位图是全局性问题，单独标注）
  const placeholderCount = issues.placeholderImage.length;
  const imageNote = placeholderCount > 0
    ? `⚠️ ${placeholderCount} 道菜使用 picsum.photos 随机占位图，与菜名不匹配，属于已知全局问题，将在图片策略中统一处理`
    : '图片均为真实资源';

  const report = {
    auditedAt: new Date().toISOString(),
    totalRecipes: total,
    totalIssues,
    recipesWithIssues: recipeQuality.size,
    imageNote,
    summary: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.length])),
    issues,
    recipeQuality: qualityList.slice(0, 500) // 前500条明细
  };

  const outPath = path.join(__dirname, '..', 'data', 'quality-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n报告已写入: ${outPath}`);
  console.log(`\n${imageNote}`);

  await sequelize.close();
}

audit().catch((e) => {
  console.error('审计失败:', e);
  process.exit(1);
});
