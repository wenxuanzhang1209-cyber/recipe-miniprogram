const { Op } = require('sequelize');
const { User, Recipe, Favorite, BrowseHistory } = require('../models');
const config = require('../config');

const LIST_ATTRIBUTES = [
  'id', 'name', 'cover_image', 'cuisine_type', 'taste', 'cooking_method',
  'difficulty', 'prep_time', 'cook_time', 'view_count', 'favorite_count'
];

const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'nickname', 'avatar', 'phone', 'preferences', 'created_at']
  });
  if (!user) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }
  const [favoriteCount, historyCount] = await Promise.all([
    Favorite.count({ where: { user_id: userId } }),
    BrowseHistory.count({ where: { user_id: userId } })
  ]);
  return { ...user.toJSON(), stats: { favoriteCount, historyCount } };
};

const updateProfile = async (userId, payload) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }
  const allowed = {};
  if (payload.nickname !== undefined) allowed.nickname = String(payload.nickname).slice(0, 50);
  if (payload.avatar !== undefined) allowed.avatar = payload.avatar;
  if (payload.phone !== undefined) allowed.phone = payload.phone;
  await user.update(allowed);
  return getProfile(userId);
};

const updatePreferences = async (userId, preferences) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }
  await user.update({ preferences: { ...user.preferences, ...preferences } });
  return user.preferences;
};

/**
 * 添加收藏
 */
const addFavorite = async (userId, recipeId) => {
  const recipe = await Recipe.findByPk(recipeId);
  if (!recipe) {
    const err = new Error('菜谱不存在');
    err.status = 404;
    throw err;
  }
  const [fav, created] = await Favorite.findOrCreate({
    where: { user_id: userId, recipe_id: recipeId }
  });
  if (created) {
    await Recipe.increment('favorite_count', { where: { id: recipeId } });
  }
  return fav;
};

/**
 * 取消收藏
 */
const removeFavorite = async (userId, recipeId) => {
  const deleted = await Favorite.destroy({
    where: { user_id: userId, recipe_id: recipeId }
  });
  if (deleted) {
    await Recipe.decrement('favorite_count', { where: { id: recipeId, favorite_count: { [Op.gt]: 0 } } });
  }
  return deleted > 0;
};

/**
 * 收藏列表（分页）
 */
const listFavorites = async (userId, query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || config.pagination.defaultLimit, config.pagination.maxLimit);

  const { rows, count } = await Favorite.findAndCountAll({
    where: { user_id: userId },
    include: [{ model: Recipe, as: 'recipe', attributes: LIST_ATTRIBUTES }],
    order: [['created_at', 'DESC']],
    offset: (page - 1) * limit,
    limit
  });

  return {
    rows: rows.map((f) => ({ favorite_id: f.id, favorited_at: f.created_at, ...f.recipe?.toJSON() })),
    count, page, limit
  };
};

/**
 * 浏览历史（分页）
 */
const listHistory = async (userId, query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || config.pagination.defaultLimit, config.pagination.maxLimit);

  const { rows, count } = await BrowseHistory.findAndCountAll({
    where: { user_id: userId },
    include: [{ model: Recipe, as: 'recipe', attributes: LIST_ATTRIBUTES }],
    order: [['viewed_at', 'DESC']],
    offset: (page - 1) * limit,
    limit
  });

  return {
    rows: rows.map((h) => ({ viewed_at: h.viewed_at, ...h.recipe?.toJSON() })),
    count, page, limit
  };
};

/**
 * 清空浏览历史
 */
const clearHistory = async (userId) => {
  return BrowseHistory.destroy({ where: { user_id: userId } });
};

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  addFavorite,
  removeFavorite,
  listFavorites,
  listHistory,
  clearHistory
};
