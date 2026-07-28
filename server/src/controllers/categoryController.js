const categoryService = require('../services/categoryService');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');

const tree = asyncHandler(async (req, res) => {
  const grouped = await categoryService.getCategoryTree();
  return success(res, grouped);
});

const recipes = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await categoryService.getRecipesByCategory(req.params.id, req.query);
  return paginated(res, rows, count, page, limit);
});

module.exports = { tree, recipes };
