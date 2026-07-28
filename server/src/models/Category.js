const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: '分类名称'
  },
  parent_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: null,
    comment: '父分类ID，null为顶级'
  },
  type: {
    type: DataTypes.ENUM('cuisine', 'taste', 'method', 'meal', 'ingredient'),
    allowNull: false,
    comment: '分类类型: cuisine菜系/taste口味/method做法/meal餐次/ingredient食材'
  },
  icon: {
    type: DataTypes.STRING(200),
    defaultValue: '',
    comment: '图标URL或emoji'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序权重'
  }
}, {
  tableName: 'categories',
  indexes: [
    { fields: ['type'] },
    { fields: ['parent_id'] }
  ]
});

module.exports = Category;
