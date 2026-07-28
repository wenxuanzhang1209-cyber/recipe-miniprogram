const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '菜名'
  },
  cover_image: {
    type: DataTypes.STRING(500),
    defaultValue: '',
    comment: '封面图片URL'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '菜品描述'
  },
  cuisine_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '菜系: 川菜/粤菜/鲁菜/苏菜/浙菜/闽菜/湘菜/徽菜/家常菜/其他'
  },
  taste: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '口味: 咸/甜/酸/辣/鲜/清淡/麻辣/酸甜/咸鲜/香辣'
  },
  cooking_method: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '烹饪方式: 炒/煮/蒸/炖/煎/烤/炸/卤/拌/腌/焖/烧'
  },
  difficulty: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 2,
    validate: { min: 1, max: 5 },
    comment: '难度等级 1-5'
  },
  prep_time: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    comment: '准备时间(分钟)'
  },
  cook_time: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    comment: '烹饪时间(分钟)'
  },
  servings: {
    type: DataTypes.TINYINT,
    defaultValue: 2,
    comment: '份数'
  },
  calories: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '卡路里(每份)'
  },
  tips: {
    type: DataTypes.TEXT,
    comment: '烹饪技巧/小贴士'
  },
  video_url: {
    type: DataTypes.STRING(500),
    defaultValue: '',
    comment: '视频教程URL'
  },
  view_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
    comment: '浏览次数'
  },
  favorite_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
    comment: '收藏次数'
  }
}, {
  tableName: 'recipes',
  indexes: [
    { fields: ['cuisine_type'] },
    { fields: ['taste'] },
    { fields: ['cooking_method'] },
    { fields: ['difficulty'] },
    { fields: ['view_count'] },
    { fields: ['favorite_count'] },
    { fields: ['name'] }
  ]
});

module.exports = Recipe;
