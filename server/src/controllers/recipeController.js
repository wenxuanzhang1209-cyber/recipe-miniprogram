const recipeService = require('../services/recipeService');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');

const list = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await recipeService.listRecipes(req.query);
  return paginated(res, rows, count, page, limit);
});

const search = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await recipeService.searchRecipes(req.query);
  return paginated(res, rows, count, page, limit);
});

const popular = asyncHandler(async (req, res) => {
  const rows = await recipeService.getPopularRecipes(req.query.limit || 10);
  return success(res, rows);
});

const recommend = asyncHandler(async (req, res) => {
  const rows = await recipeService.getRecommendedRecipes(req.user?.id || null, req.query.limit || 10);
  return success(res, rows);
});

const detail = asyncHandler(async (req, res) => {
  const recipe = await recipeService.getRecipeDetail(req.params.id, req.user?.id || null);
  return success(res, recipe);
});

const related = asyncHandler(async (req, res) => {
  const rows = await recipeService.getRelatedRecipes(req.params.id, req.query.limit || 6);
  return success(res, rows);
});

const create = asyncHandler(async (req, res) => {
  const recipe = await recipeService.createRecipe(req.body);
  return success(res, recipe, '创建成功');
});

const update = asyncHandler(async (req, res) => {
  const recipe = await recipeService.updateRecipe(req.params.id, req.body);
  return success(res, recipe, '更新成功');
});

const remove = asyncHandler(async (req, res) => {
  await recipeService.deleteRecipe(req.params.id);
  return success(res, null, '删除成功');
});

module.exports = { list, search, popular, recommend, detail, related, create, update, remove };
