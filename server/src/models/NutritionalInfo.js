const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NutritionalInfo = sequelize.define('NutritionalInfo', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  recipe_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    unique: true
  },
  protein: {
    type: DataTypes.DECIMAL(6, 1),
    defaultValue: 0,
    comment: '蛋白质(克/份)'
  },
  fat: {
    type: DataTypes.DECIMAL(6, 1),
    defaultValue: 0,
    comment: '脂肪(克/份)'
  },
  carbs: {
    type: DataTypes.DECIMAL(6, 1),
    defaultValue: 0,
    comment: '碳水化合物(克/份)'
  },
  fiber: {
    type: DataTypes.DECIMAL(6, 1),
    defaultValue: 0,
    comment: '膳食纤维(克/份)'
  },
  sodium: {
    type: DataTypes.DECIMAL(8, 1),
    defaultValue: 0,
    comment: '钠(毫克/份)'
  },
  calories: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '热量(千卡/份)'
  }
}, {
  tableName: 'nutritional_info'
});

module.exports = NutritionalInfo;
