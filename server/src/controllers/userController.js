const userService = require('../services/userService');
const { success, paginated, fail } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');

const profile = asyncHandler(async (req, res) => {
  const data = await userService.getProfile(req.user.id);
  return success(res, data);
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = await userService.updateProfile(req.user.id, req.body);
  return success(res, data, '资料更新成功');
});

const updatePreferences = asyncHandler(async (req, res) => {
  const data = await userService.updatePreferences(req.user.id, req.body);
  return success(res, data, '偏好设置已保存');
});

const addFavorite = asyncHandler(async (req, res) => {
  const { recipeId } = req.body;
  if (!recipeId) return fail(res, '缺少参数 recipeId', 422, 422);
  await userService.addFavorite(req.user.id, recipeId);
  return success(res, null, '收藏成功');
});

const removeFavorite = asyncHandler(async (req, res) => {
  const removed = await userService.removeFavorite(req.user.id, req.params.recipeId);
  if (!removed) return fail(res, '未收藏该菜谱', 404, 404);
  return success(res, null, '已取消收藏');
});

const listFavorites = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await userService.listFavorites(req.user.id, req.query);
  return paginated(res, rows, count, page, limit);
});

const listHistory = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await userService.listHistory(req.user.id, req.query);
  return paginated(res, rows, count, page, limit);
});

const clearHistory = asyncHandler(async (req, res) => {
  await userService.clearHistory(req.user.id);
  return success(res, null, '浏览历史已清空');
});

module.exports = {
  profile,
  updateProfile,
  updatePreferences,
  addFavorite,
  removeFavorite,
  listFavorites,
  listHistory,
  clearHistory
};
