// utils/api.js - 接口定义层
const { get, post, put, del } = require('./request');

module.exports = {
  // 认证
  wxLogin: (code, userInfo) => post('/auth/wx-login', { code, ...userInfo }),
  logout: () => post('/auth/logout'),

  // 菜谱
  getRecipes: (params) => get('/recipes', params),
  searchRecipes: (params) => get('/recipes/search', params),
  getPopular: (limit = 10) => get('/recipes/popular', { limit }),
  getRecommend: (limit = 10) => get('/recipes/recommend', { limit }),
  getRecipeDetail: (id) => get(`/recipes/${id}`),
  getRelated: (id, limit = 6) => get(`/recipes/${id}/related`, { limit }),

  // 分类
  getCategories: () => get('/categories'),
  getCategoryRecipes: (id, params) => get(`/categories/${id}/recipes`, params),

  // 用户
  getProfile: () => get('/user/profile'),
  updateProfile: (data) => put('/user/profile', data),
  updatePreferences: (data) => put('/user/preferences', data),

  // 收藏
  addFavorite: (recipeId) => post('/favorites', { recipeId }),
  removeFavorite: (recipeId) => del(`/favorites/${recipeId}`),
  getFavorites: (params) => get('/favorites', params),

  // 历史
  getHistory: (params) => get('/history', params),
  clearHistory: () => del('/history')
};
