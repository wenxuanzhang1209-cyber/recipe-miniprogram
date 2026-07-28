const { Op, literal } = require('sequelize');
const {
  sequelize, Recipe, Ingredient, RecipeIngredient, RecipeStep,
  Category, Tag, NutritionalInfo, Favorite, BrowseHistory, User
} = require('../models');
const cache = require('../utils/cache');
const config = require('../config');

const LIST_ATTRIBUTES = [
  'id', 'name', 'cover_image', 'description', 'cuisine_type', 'taste',
  'cooking_method', 'difficulty', 'prep_time', 'cook_time', 'servings',
  'calories', 'view_count', 'favorite_count'
];

const clampLimit = (limit) => {
  const n = parseInt(limit, 10) || config.pagination.defaultLimit;
  return Math.min(Math.max(n, 1), config.pagination.maxLimit);
};

/**
 * 菜谱列表（分页 + 多条件筛选 + 排序）
 */
const listRecipes = async (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = clampLimit(query.limit);
  const where = {};

  if (query.cuisine) where.cuisine_type = query.cuisine;
  if (query.taste) where.taste = query.taste;
  if (query.method) where.cooking_method = query.method;
  if (query.difficulty) where.difficulty = parseInt(query.difficulty, 10);
  if (query.maxTime) {
    where[Op.and] = literal(`(prep_time + cook_time) <= ${parseInt(query.maxTime, 10)}`);
  }

  const orderMap = {
    newest: [['id', 'DESC']],
    popular: [['view_count', 'DESC']],
    favorite: [['favorite_count', 'DESC']],
    quickest: [[literal('(prep_time + cook_time)'), 'ASC']],
    easiest: [['difficulty', 'ASC'], ['view_count', 'DESC']]
  };
  const order = orderMap[query.sort] || orderMap.newest;

  const { rows, count } = await Recipe.findAndCountAll({
    where,
    attributes: LIST_ATTRIBUTES,
    order,
    offset: (page - 1) * limit,
    limit,
    distinct: true
  });

  return { rows, count, page, limit };
};

/**
 * 关键词搜索：菜名 / 描述 / 食材名
 */
const searchRecipes = async (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = clampLimit(query.limit);
  const keyword = (query.keyword || '').trim();

  if (!keyword) return { rows: [], count: 0, page, limit };

  const where = {};
  if (query.cuisine) where.cuisine_type = query.cuisine;
  if (query.difficulty) where.difficulty = parseInt(query.difficulty, 10);

  // 通过食材名反查菜谱ID
  const ingredientMatches = await RecipeIngredient.findAll({
    attributes: ['recipe_id'],
    include: [{
      model: Ingredient,
      as: 'ingredient',
      attributes: [],
      where: { name: { [Op.like]: `%${keyword}%` } },
      required: true
    }],
    raw: true
  });
  const recipeIdsByIngredient = [...new Set(ingredientMatches.map((r) => r.recipe_id))];

  where[Op.or] = [
    { name: { [Op.like]: `%${keyword}%` } },
    { description: { [Op.like]: `%${keyword}%` } },
    ...(recipeIdsByIngredient.length ? [{ id: { [Op.in]: recipeIdsByIngredient } }] : [])
  ];

  const { rows, count } = await Recipe.findAndCountAll({
    where,
    attributes: LIST_ATTRIBUTES,
    order: [['view_count', 'DESC']],
    offset: (page - 1) * limit,
    limit,
    distinct: true
  });

  return { rows, count, page, limit };
};

/**
 * 菜谱详情（含食材、步骤、营养、标签、分类）
 */
const getRecipeDetail = async (id, userId = null) => {
  const recipe = await Recipe.findByPk(id, {
    include: [
      {
        model: RecipeIngredient,
        as: 'recipeIngredients',
        include: [{ model: Ingredient, as: 'ingredient', attributes: ['id', 'name', 'category'] }]
      },
      { model: RecipeStep, as: 'steps', separate: true, order: [['step_number', 'ASC']] },
      { model: NutritionalInfo, as: 'nutrition' },
      { model: Tag, as: 'tags', through: { attributes: [] } },
      { model: Category, as: 'categories', through: { attributes: [] } }
    ]
  });

  if (!recipe) {
    const err = new Error('菜谱不存在');
    err.status = 404;
    throw err;
  }

  // 异步增加浏览量（不阻塞响应）
  Recipe.increment('view_count', { where: { id } }).catch(() => {});

  // 记录浏览历史
  if (userId) {
    BrowseHistory.upsert({ user_id: userId, recipe_id: id, viewed_at: new Date() }).catch(() => {});
  }

  const json = recipe.toJSON();
  json.total_time = (json.prep_time || 0) + (json.cook_time || 0);

  // 是否已收藏
  json.is_favorited = false;
  if (userId) {
    const fav = await Favorite.findOne({ where: { user_id: userId, recipe_id: id } });
    json.is_favorited = !!fav;
  }

  // 整理食材格式
  json.ingredients = (json.recipeIngredients || []).map((ri) => ({
    id: ri.ingredient?.id,
    name: ri.ingredient?.name,
    category: ri.ingredient?.category,
    amount: ri.amount,
    unit: ri.unit,
    is_main: ri.is_main
  }));
  delete json.recipeIngredients;

  return json;
};

/**
 * 热门菜谱（Redis 缓存）
 */
const getPopularRecipes = async (limit = 10) => {
  const n = clampLimit(limit);
  return cache.wrap(`popular:${n}`, config.cache.popularTTL, async () => {
    return Recipe.findAll({
      attributes: LIST_ATTRIBUTES,
      order: [['view_count', 'DESC'], ['favorite_count', 'DESC']],
      limit: n
    });
  });
};

/**
 * 推荐菜谱：真实个性化推荐
 * 优先级：显式偏好 > 浏览历史推断 > 随机热门
 * 硬性排除：忌口食材、过敏原、荤素偏好冲突
 * 每条结果附带推荐理由
 */
const getRecommendedRecipes = async (userId = null, limit = 10) => {
  const n = clampLimit(limit);

  // 未登录：随机热门池
  if (!userId) {
    return cache.wrap(`recommend:default:${n}`, config.cache.popularTTL, async () => {
      return Recipe.findAll({
        attributes: LIST_ATTRIBUTES,
        order: sequelize.random(),
        where: { view_count: { [Op.gte]: 0 } },
        limit: n
      });
    });
  }

  // 加载用户偏好 + 最近浏览
  const [user, recent] = await Promise.all([
    User.findByPk(userId, { attributes: ['preferences'] }),
    BrowseHistory.findAll({
      where: { user_id: userId },
      include: [{ model: Recipe, as: 'recipe', attributes: ['cuisine_type'] }],
      order: [['viewed_at', 'DESC']],
      limit: 20
    })
  ]);

  const prefs = (user && user.preferences) || {};

  // 1. 菜系偏好：显式设置优先，否则从浏览历史推断
  let topCuisines = Array.isArray(prefs.cuisines) ? prefs.cuisines.slice(0, 5) : [];
  let cuisineFromHistory = false;
  if (!topCuisines.length) {
    const cuisineCount = {};
    recent.forEach((h) => {
      const c = h.recipe && h.recipe.cuisine_type;
      if (c) cuisineCount[c] = (cuisineCount[c] || 0) + 1;
    });
    topCuisines = Object.entries(cuisineCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);
    cuisineFromHistory = topCuisines.length > 0;
  }

  // 2. 硬性排除：忌口食材 + 过敏原
  const avoidList = [
    ...new Set([
      ...(Array.isArray(prefs.avoidIngredients) ? prefs.avoidIngredients : []),
      ...(Array.isArray(prefs.allergens) ? prefs.allergens : [])
    ])
  ];
  const excludedIdSet = new Set();
  if (avoidList.length) {
    const matches = await RecipeIngredient.findAll({
      attributes: ['recipe_id'],
      include: [{
        model: Ingredient, as: 'ingredient', attributes: [],
        where: { name: { [Op.in]: avoidList } },
        required: true
      }],
      raw: true
    });
    matches.forEach((m) => excludedIdSet.add(m.recipe_id));
  }

  // 荤素偏好：素食/纯素排除含肉类、海鲜食材的菜谱
  if (prefs.dietType === 'vegetarian' || prefs.dietType === 'vegan') {
    const meatCats = prefs.dietType === 'vegan' ? ['肉类', '海鲜', '蛋奶'] : ['肉类', '海鲜'];
    const meatMatches = await RecipeIngredient.findAll({
      attributes: ['recipe_id'],
      include: [{
        model: Ingredient, as: 'ingredient', attributes: [],
        where: { category: { [Op.in]: meatCats } },
        required: true
      }],
      raw: true
    });
    meatMatches.forEach((m) => excludedIdSet.add(m.recipe_id));
  }

  // 排除已浏览过的
  recent.forEach((h) => excludedIdSet.add(h.recipe_id));

  // 3. 构建查询条件
  const where = {};
  if (excludedIdSet.size) where.id = { [Op.notIn]: [...excludedIdSet] };
  if (prefs.difficulties && prefs.difficulties.length) {
    where.difficulty = { [Op.in]: prefs.difficulties.map((d) => parseInt(d, 10)) };
  }
  const andConditions = [];
  if (prefs.maxCookTime) {
    andConditions.push(literal(`(prep_time + cook_time) <= ${parseInt(prefs.maxCookTime, 10)}`));
  }
  if (andConditions.length) where[Op.and] = andConditions;

  // 4. 排序策略（根据饮食目标）
  let order = [['favorite_count', 'DESC'], ['view_count', 'DESC']];
  if (prefs.dietGoal === 'lowfat') order = [['calories', 'ASC'], ['favorite_count', 'DESC']];
  else if (prefs.dietGoal === 'quick') order = [[literal('(prep_time + cook_time)'), 'ASC'], ['favorite_count', 'DESC']];
  else if (prefs.dietGoal === 'highprotein') order = [['calories', 'DESC'], ['favorite_count', 'DESC']];

  // 5. 先查偏好菜系，不足时放宽回填
  let recipes = [];
  if (topCuisines.length) {
    recipes = await Recipe.findAll({
      attributes: LIST_ATTRIBUTES,
      where: { ...where, cuisine_type: { [Op.in]: topCuisines } },
      order,
      limit: n
    });
  }
  if (recipes.length < n) {
    const existingIds = new Set(recipes.map((r) => r.id));
    const fallbackWhere = { ...where };
    const notIn = [...excludedIdSet, ...existingIds];
    fallbackWhere.id = { [Op.notIn]: notIn };
    const more = await Recipe.findAll({
      attributes: LIST_ATTRIBUTES,
      where: fallbackWhere,
      order: [['favorite_count', 'DESC'], ['view_count', 'DESC']],
      limit: n - recipes.length
    });
    recipes = recipes.concat(more);
  }

  // 6. 生成推荐理由
  return recipes.map((r) => {
    const json = r.toJSON();
    json.recommend_reason = buildRecommendReason(json, prefs, topCuisines, cuisineFromHistory);
    return json;
  });
};

/**
 * 推荐理由生成器 — 简短、真实、基于实际匹配条件
 */
const buildRecommendReason = (recipe, prefs, topCuisines, fromHistory) => {
  const reasons = [];
  if (topCuisines.includes(recipe.cuisine_type)) {
    reasons.push(fromHistory
      ? `你最近常看${recipe.cuisine_type}`
      : `符合你喜欢的${recipe.cuisine_type}口味`);
  }
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  if (prefs.dietGoal === 'quick' && totalTime <= 30) {
    reasons.push(`${totalTime}分钟内可完成`);
  } else if (totalTime <= 20) {
    reasons.push(`快手菜，仅需${totalTime}分钟`);
  }
  if (prefs.dietGoal === 'lowfat' && recipe.calories && recipe.calories <= 200) {
    reasons.push(`每份仅${recipe.calories}千卡`);
  }
  if (recipe.difficulty <= 2 && (prefs.difficulties || []).length) {
    reasons.push('简单易上手');
  }
  if (prefs.spiceLevel === 'none' && recipe.taste && !recipe.taste.includes('辣')) {
    reasons.push('不辣，符合你的口味');
  }
  if (!reasons.length && recipe.favorite_count >= 300) {
    reasons.push(`${recipe.favorite_count}人收藏`);
  }
  return reasons[0] || '根据你的口味推荐';
};

/**
 * 相关菜谱：同菜系或同烹饪方式
 */
const getRelatedRecipes = async (recipeId, limit = 6) => {
  const recipe = await Recipe.findByPk(recipeId, { attributes: ['cuisine_type', 'cooking_method'] });
  if (!recipe) return [];

  return Recipe.findAll({
    where: {
      id: { [Op.ne]: recipeId },
      [Op.or]: [
        { cuisine_type: recipe.cuisine_type },
        { cooking_method: recipe.cooking_method }
      ]
    },
    attributes: LIST_ATTRIBUTES,
    order: [['favorite_count', 'DESC']],
    limit: clampLimit(limit)
  });
};

/**
 * 创建菜谱（管理用途）
 */
const createRecipe = async (payload) => {
  return sequelize.transaction(async (t) => {
    const recipe = await Recipe.create(payload, { transaction: t });

    if (Array.isArray(payload.steps)) {
      await RecipeStep.bulkCreate(
        payload.steps.map((s, i) => ({
          recipe_id: recipe.id,
          step_number: i + 1,
          description: s.description,
          image_url: s.image_url || '',
          duration: s.duration || 0
        })),
        { transaction: t }
      );
    }

    if (Array.isArray(payload.ingredients)) {
      for (const item of payload.ingredients) {
        const [ing] = await Ingredient.findOrCreate({
          where: { name: item.name },
          defaults: { category: item.category || '其他' },
          transaction: t
        });
        await RecipeIngredient.create({
          recipe_id: recipe.id,
          ingredient_id: ing.id,
          amount: item.amount || '适量',
          unit: item.unit || '',
          is_main: item.is_main !== false
        }, { transaction: t });
      }
    }

    if (payload.nutrition) {
      await NutritionalInfo.create({ ...payload.nutrition, recipe_id: recipe.id }, { transaction: t });
    }

    await cache.delByPattern('popular:*');
    return recipe;
  });
};

/**
 * 更新菜谱
 */
const updateRecipe = async (id, payload) => {
  const recipe = await Recipe.findByPk(id);
  if (!recipe) {
    const err = new Error('菜谱不存在');
    err.status = 404;
    throw err;
  }
  await recipe.update(payload);
  await cache.delByPattern('popular:*');
  return recipe;
};

/**
 * 删除菜谱（级联清理关联数据）
 */
const deleteRecipe = async (id) => {
  const recipe = await Recipe.findByPk(id);
  if (!recipe) {
    const err = new Error('菜谱不存在');
    err.status = 404;
    throw err;
  }
  await sequelize.transaction(async (t) => {
    await RecipeStep.destroy({ where: { recipe_id: id }, transaction: t });
    await RecipeIngredient.destroy({ where: { recipe_id: id }, transaction: t });
    await NutritionalInfo.destroy({ where: { recipe_id: id }, transaction: t });
    await Favorite.destroy({ where: { recipe_id: id }, transaction: t });
    await BrowseHistory.destroy({ where: { recipe_id: id }, transaction: t });
    await recipe.destroy({ transaction: t });
  });
  await cache.delByPattern('popular:*');
};

module.exports = {
  listRecipes,
  searchRecipes,
  getRecipeDetail,
  getPopularRecipes,
  getRecommendedRecipes,
  getRelatedRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe
};
