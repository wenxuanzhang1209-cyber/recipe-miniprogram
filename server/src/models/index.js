const sequelize = require('../config/database');
const Recipe = require('./Recipe');
const Ingredient = require('./Ingredient');
const RecipeIngredient = require('./RecipeIngredient');
const RecipeStep = require('./RecipeStep');
const Category = require('./Category');
const Tag = require('./Tag');
const User = require('./User');
const Favorite = require('./Favorite');
const BrowseHistory = require('./BrowseHistory');
const NutritionalInfo = require('./NutritionalInfo');

// ---------- 中间表 ----------
const RecipeCategory = sequelize.define('RecipeCategory', {}, {
  tableName: 'recipe_categories',
  timestamps: false
});

const RecipeTag = sequelize.define('RecipeTag', {}, {
  tableName: 'recipe_tags',
  timestamps: false
});

// ---------- 关联关系 ----------

// Recipe <-> Ingredient (多对多，带用量信息)
Recipe.belongsToMany(Ingredient, {
  through: RecipeIngredient,
  foreignKey: 'recipe_id',
  otherKey: 'ingredient_id',
  as: 'ingredients'
});
Ingredient.belongsToMany(Recipe, {
  through: RecipeIngredient,
  foreignKey: 'ingredient_id',
  otherKey: 'recipe_id',
  as: 'recipes'
});
RecipeIngredient.belongsTo(Ingredient, { foreignKey: 'ingredient_id', as: 'ingredient' });
RecipeIngredient.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe' });
Recipe.hasMany(RecipeIngredient, { foreignKey: 'recipe_id', as: 'recipeIngredients' });

// Recipe -> RecipeStep (一对多)
Recipe.hasMany(RecipeStep, { foreignKey: 'recipe_id', as: 'steps' });
RecipeStep.belongsTo(Recipe, { foreignKey: 'recipe_id' });

// Recipe <-> Category (多对多)
Recipe.belongsToMany(Category, {
  through: RecipeCategory,
  foreignKey: 'recipe_id',
  otherKey: 'category_id',
  as: 'categories'
});
Category.belongsToMany(Recipe, {
  through: RecipeCategory,
  foreignKey: 'category_id',
  otherKey: 'recipe_id',
  as: 'recipes'
});

// Category 自关联（多级分类）
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });

// Recipe <-> Tag (多对多)
Recipe.belongsToMany(Tag, {
  through: RecipeTag,
  foreignKey: 'recipe_id',
  otherKey: 'tag_id',
  as: 'tags'
});
Tag.belongsToMany(Recipe, {
  through: RecipeTag,
  foreignKey: 'tag_id',
  otherKey: 'recipe_id',
  as: 'recipes'
});

// Recipe -> NutritionalInfo (一对一)
Recipe.hasOne(NutritionalInfo, { foreignKey: 'recipe_id', as: 'nutrition' });
NutritionalInfo.belongsTo(Recipe, { foreignKey: 'recipe_id' });

// User <-> Recipe 收藏 (多对多)
User.belongsToMany(Recipe, {
  through: Favorite,
  foreignKey: 'user_id',
  otherKey: 'recipe_id',
  as: 'favoriteRecipes'
});
Recipe.belongsToMany(User, {
  through: Favorite,
  foreignKey: 'recipe_id',
  otherKey: 'user_id',
  as: 'favoritedBy'
});
Favorite.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> BrowseHistory (一对多)
User.hasMany(BrowseHistory, { foreignKey: 'user_id', as: 'browseHistory' });
BrowseHistory.belongsTo(User, { foreignKey: 'user_id' });
BrowseHistory.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe' });

module.exports = {
  sequelize,
  Recipe,
  Ingredient,
  RecipeIngredient,
  RecipeStep,
  Category,
  RecipeCategory,
  Tag,
  RecipeTag,
  User,
  Favorite,
  BrowseHistory,
  NutritionalInfo
};
