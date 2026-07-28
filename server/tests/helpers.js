/**
 * 测试环境初始化：使用独立的 SQLite 内存库 + 种子数据
 */
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const {
  sequelize, Recipe, Ingredient, RecipeIngredient, RecipeStep,
  Category, Tag, NutritionalInfo, User
} = require('../src/models');

/**
 * 建表并写入基础种子数据
 */
const setupDatabase = async () => {
  await sequelize.sync({ force: true });

  // 分类
  const cuisineCat = await Category.create({ name: '川菜', type: 'cuisine', icon: '🌶' });
  await Category.create({ name: '麻辣', type: 'taste', icon: '😋' });
  await Category.create({ name: '炒', type: 'method', icon: '🔥' });

  // 食材
  const pork = await Ingredient.create({ name: '猪五花肉', category: '肉类' });
  const pepper = await Ingredient.create({ name: '青椒', category: '蔬菜' });

  // 菜谱 x 25（用于分页测试）
  const recipes = [];
  for (let i = 1; i <= 25; i++) {
    recipes.push({
      name: `测试菜谱${i}`,
      description: i === 1 ? '经典回锅肉做法' : `测试描述${i}`,
      cuisine_type: i % 2 === 0 ? '川菜' : '粤菜',
      taste: i % 2 === 0 ? '麻辣' : '咸鲜',
      cooking_method: '炒',
      difficulty: (i % 5) + 1,
      prep_time: 10,
      cook_time: i,
      servings: 2,
      calories: 300 + i,
      view_count: 1000 - i,
      favorite_count: 100 - i
    });
  }
  const created = await Recipe.bulkCreate(recipes);

  // 第一道菜补全关联数据
  const first = created[0];
  await RecipeIngredient.bulkCreate([
    { recipe_id: first.id, ingredient_id: pork.id, amount: '300克', is_main: true },
    { recipe_id: first.id, ingredient_id: pepper.id, amount: '2个', is_main: false }
  ]);
  await RecipeStep.bulkCreate([
    { recipe_id: first.id, step_number: 1, description: '五花肉切片' },
    { recipe_id: first.id, step_number: 2, description: '下锅爆炒' }
  ]);
  await NutritionalInfo.create({
    recipe_id: first.id, protein: 20, fat: 30, carbs: 10, fiber: 2, sodium: 500, calories: 400
  });

  return { recipes: created, cuisineCat };
};

/**
 * 创建测试用户并返回 token
 */
const createTestUser = async () => {
  const { signToken } = require('../src/middlewares/auth');
  const user = await User.create({ openid: `test_openid_${Date.now()}_${Math.random()}` });
  return { user, token: signToken(user) };
};

module.exports = { setupDatabase, createTestUser, sequelize };
