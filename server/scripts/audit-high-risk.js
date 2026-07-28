/* eslint-disable no-console */
/**
 * 高风险数据终审脚本
 * 扫描全部菜谱，识别需要人工复核的高风险内容（生食/未熟肉类/高温油炸/压力锅/酒精/儿童/过敏原/不安全步骤）
 *
 * 用法: DB_DIALECT=sqlite node scripts/audit-high-risk.js
 * 输出: server/data/high-risk-report.json + 控制台摘要
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const path = require('path');
const { sequelize, Recipe, RecipeStep, RecipeIngredient, Ingredient } = require('../src/models');

// 高风险关键词分类
const RISK_RULES = [
  { key: 'rawFood', label: '生食', keywords: ['生吃', '生拌', '刺身', '生腌', '醉虾', '醉蟹', '生滚'] },
  { key: 'undercookedMeat', label: '未熟肉类', keywords: ['三分熟', '五分熟', '七分熟', '带血', '溏心', '半生'] },
  { key: 'deepFry', label: '高温油炸', keywords: ['油炸', '复炸', '宽油', '炸至', '过油', '滑油'] },
  { key: 'pressureCooker', label: '压力锅', keywords: ['高压锅', '压力锅', '电压力'] },
  { key: 'alcohol', label: '酒精', keywords: ['料酒', '白酒', '啤酒', '红酒', '黄酒', '朗姆', '白兰地', '米酒', '清酒', '梅酒'] },
  { key: 'children', label: '儿童饮食', keywords: ['儿童', '宝宝', '婴儿', '辅食', '幼儿'] },
  { key: 'unsafeStep', label: '不安全步骤', keywords: ['直接食用', '无需加热', '室温放置', '隔夜', '反复解冻'] }
];

// 常见过敏原食材
const ALLERGEN_KEYWORDS = ['花生', '坚果', '核桃', '杏仁', '腰果', '开心果', '芝麻', '虾', '蟹', '贝', '海鲜', '鸡蛋', '牛奶', '大豆', '小麦'];

async function main() {
  console.log('=== 高风险数据终审 ===\n');
  await sequelize.authenticate();

  const total = await Recipe.count();
  console.log(`菜谱总数: ${total}\n`);

  const riskMap = {}; // recipeId -> { name, risks: [] }
  RISK_RULES.forEach((r) => { riskMap[r.key] = []; });

  // 扫描菜谱名 + 描述 + 小贴士
  const pageSize = 500;
  for (let offset = 0; offset < total; offset += pageSize) {
    const recipes = await Recipe.findAll({
      offset, limit: pageSize, order: [['id', 'ASC']],
      attributes: ['id', 'name', 'description', 'tips'], raw: true
    });
    for (const r of recipes) {
      const text = `${r.name} ${r.description || ''} ${r.tips || ''}`;
      for (const rule of RISK_RULES) {
        const hit = rule.keywords.find((kw) => text.includes(kw));
        if (hit) riskMap[rule.key].push({ id: r.id, name: r.name, keyword: hit });
      }
    }
  }

  // 扫描步骤中的高风险内容
  console.log('扫描步骤内容...');
  const steps = await RecipeStep.findAll({ attributes: ['recipe_id', 'description'], raw: true });
  const recipeNameCache = new Map();
  const stepHits = { rawFood: [], undercookedMeat: [], unsafeStep: [] };
  for (const s of steps) {
    for (const rule of RISK_RULES) {
      if (!['rawFood', 'undercookedMeat', 'unsafeStep'].includes(rule.key)) continue;
      const hit = rule.keywords.find((kw) => s.description.includes(kw));
      if (hit) {
        if (!recipeNameCache.has(s.recipe_id)) {
          const rec = await Recipe.findByPk(s.recipe_id, { attributes: ['name'] });
          recipeNameCache.set(s.recipe_id, rec ? rec.name : '');
        }
        stepHits[rule.key].push({ id: s.recipe_id, name: recipeNameCache.get(s.recipe_id), keyword: hit, source: 'step' });
      }
    }
  }
  // 合并步骤命中
  Object.keys(stepHits).forEach((k) => { riskMap[k] = riskMap[k].concat(stepHits[k]); });

  // 过敏原食材分布
  console.log('统计过敏原食材...');
  const allergenRecipes = new Map(); // recipeId -> [过敏原]
  for (const kw of ALLERGEN_KEYWORDS) {
    const rows = await RecipeIngredient.findAll({
      attributes: ['recipe_id'],
      include: [{ model: Ingredient, as: 'ingredient', attributes: ['name'], where: { name: { [require('sequelize').Op.like]: `%${kw}%` } }, required: true }],
      raw: true
    }).catch(() => []);
    rows.forEach((r) => {
      if (!allergenRecipes.has(r.recipe_id)) allergenRecipes.set(r.recipe_id, new Set());
      allergenRecipes.get(r.recipe_id).add(kw);
    });
  }

  // 营养数据估算标注检查（抽10条验证calories合理性）
  const nutritionSample = await Recipe.findAll({
    where: { calories: { [require('sequelize').Op.gt]: 0 } },
    attributes: ['id', 'name', 'calories'], limit: 10, raw: true
  });
  const unreasonableNutrition = nutritionSample.filter((r) => r.calories > 1500 || r.calories < 20);

  // 汇总
  console.log('\n=== 高风险清单摘要 ===');
  let totalFlagged = 0;
  const summary = {};
  for (const rule of RISK_RULES) {
    const count = riskMap[rule.key].length;
    summary[rule.label] = count;
    totalFlagged += count;
    console.log(`  ${rule.label}: ${count} 条`);
  }
  console.log(`  含过敏原食材菜谱: ${allergenRecipes.size} 条`);
  console.log(`  营养数据异常(抽样): ${unreasonableNutrition.length} 条`);

  const report = {
    auditedAt: new Date().toISOString(),
    releaseVersion: 'v1.0.0-rc.1',
    totalRecipes: total,
    summary,
    allergenRecipeCount: allergenRecipes.size,
    nutritionDisclaimer: '营养数据为估算值，非精确检测。前端展示须标注"估算"，不得作为医疗/精确营养依据。',
    reviewRequired: '以下高风险内容需内容运营人工复核后方可正式上线，特别是生食/未熟肉类相关菜谱需附加安全提示。',
    highRisk: riskMap,
    nutritionSampleIssues: unreasonableNutrition
  };

  const outPath = path.join(__dirname, '..', 'data', 'high-risk-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n报告已写入: ${outPath}`);

  await sequelize.close();
}

main().catch((e) => { console.error('终审失败:', e); process.exit(1); });
