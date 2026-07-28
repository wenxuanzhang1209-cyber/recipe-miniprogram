const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeStep = sequelize.define('RecipeStep', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  recipe_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  step_number: {
    type: DataTypes.TINYINT,
    allowNull: false,
    comment: '步骤序号'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '步骤描述'
  },
  image_url: {
    type: DataTypes.STRING(500),
    defaultValue: '',
    comment: '步骤图片'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '该步骤耗时(分钟)'
  }
}, {
  tableName: 'recipe_steps',
  indexes: [
    { fields: ['recipe_id', 'step_number'] }
  ]
});

module.exports = RecipeStep;
