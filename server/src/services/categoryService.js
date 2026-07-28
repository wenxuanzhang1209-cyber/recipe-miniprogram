const { Category, Recipe } = require('../models');
const cache = require('../utils/cache');
const config = require('../config');

/**
 * 获取分类树（按类型分组，含子分类）
 */
const getCategoryTree = async () => {
  return cache.wrap('categories:tree', config.cache.categoriesTTL, async () => {
    const all = await Category.findAll({
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
      raw: true
    });

    const byId = new Map(all.map((c) => [c.id, { ...c, children: [] }]));
    const grouped = { cuisine: [], taste: [], method: [], meal: [], ingredient: [] };

    for (const cat of byId.values()) {
      if (cat.parent_id && byId.has(cat.parent_id)) {
        byId.get(cat.parent_id).children.push(cat);
      } else if (grouped[cat.type]) {
        grouped[cat.type].push(cat);
      }
    }
    return grouped;
  });
};

/**
 * 某分类下的菜谱（分页）
 */
const getRecipesByCategory = async (categoryId, query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || config.pagination.defaultLimit, config.pagination.maxLimit);

  const category = await Category.findByPk(categoryId);
  if (!category) {
    const err = new Error('分类不存在');
    err.status = 404;
    throw err;
  }

  // 分类映射到菜谱字段查询（性能优于中间表 join）
  const fieldMap = {
    cuisine: 'cuisine_type',
    taste: 'taste',
    method: 'cooking_method'
  };

  let rows; let count;
  if (fieldMap[category.type]) {
    ({ rows, count } = await Recipe.findAndCountAll({
      where: { [fieldMap[category.type]]: category.name },
      attributes: [
        'id', 'name', 'cover_image', 'description', 'cuisine_type', 'taste',
        'cooking_method', 'difficulty', 'prep_time', 'cook_time', 'view_count', 'favorite_count'
      ],
      order: [['view_count', 'DESC']],
      offset: (page - 1) * limit,
      limit
    }));
  } else {
    // meal / ingredient 类型走中间表
    ({ rows, count } = await Recipe.findAndCountAll({
      include: [{
        model: Category,
        as: 'categories',
        where: { id: categoryId },
        attributes: [],
        through: { attributes: [] }
      }],
      attributes: [
        'id', 'name', 'cover_image', 'description', 'cuisine_type', 'taste',
        'cooking_method', 'difficulty', 'prep_time', 'cook_time', 'view_count', 'favorite_count'
      ],
      order: [['view_count', 'DESC']],
      offset: (page - 1) * limit,
      limit,
      distinct: true
    }));
  }

  return { rows, count, page, limit, category };
};

module.exports = { getCategoryTree, getRecipesByCategory };
