const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeIngredient = sequelize.define('RecipeIngredient', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  recipe_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  ingredient_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  amount: {
    type: DataTypes.STRING(30),
    defaultValue: '适量',
    comment: '用量'
  },
  unit: {
    type: DataTypes.STRING(10),
    defaultValue: '',
    comment: '单位'
  },
  is_main: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否主料'
  }
}, {
  tableName: 'recipe_ingredients',
  indexes: [
    { fields: ['recipe_id'] },
    { fields: ['ingredient_id'] }
  ]
});

module.exports = RecipeIngredient;
