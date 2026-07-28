const { Op, literal } = require('sequelize');
const {
  sequelize, Recipe, Ingredient, RecipeIngredient, RecipeStep,
  Category, Tag, NutritionalInfo, Favorite, BrowseHistory
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
 * 推荐菜谱：登录用户按偏好菜系推荐，未登录随机热门
 */
const getRecommendedRecipes = async (userId = null, limit = 10) => {
  const n = clampLimit(limit);

  if (userId) {
    // 基于用户最近浏览的菜系偏好
    const recent = await BrowseHistory.findAll({
      where: { user_id: userId },
      include: [{ model: Recipe, as: 'recipe', attributes: ['cuisine_type'] }],
      order: [['viewed_at', 'DESC']],
      limit: 20
    });
    const cuisineCount = {};
    recent.forEach((h) => {
      const c = h.recipe?.cuisine_type;
      if (c) cuisineCount[c] = (cuisineCount[c] || 0) + 1;
    });
    const topCuisines = Object.entries(cuisineCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);

    if (topCuisines.length) {
      const viewedIds = recent.map((h) => h.recipe_id);
      return Recipe.findAll({
        where: {
          cuisine_type: { [Op.in]: topCuisines },
          id: { [Op.notIn]: viewedIds.length ? viewedIds : [0] }
        },
        attributes: LIST_ATTRIBUTES,
        order: [['favorite_count', 'DESC']],
        limit: n
      });
    }
  }

  // 默认：随机取热门池
  return cache.wrap(`recommend:default:${n}`, config.cache.popularTTL, async () => {
    return Recipe.findAll({
      attributes: LIST_ATTRIBUTES,
      order: sequelize.random(),
      where: { view_count: { [Op.gte]: 0 } },
      limit: n
    });
  });
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
