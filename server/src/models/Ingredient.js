const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ingredient = sequelize.define('Ingredient', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '食材名称'
  },
  category: {
    type: DataTypes.STRING(30),
    defaultValue: '其他',
    comment: '食材分类: 肉类/蔬菜/海鲜/调料/主食/豆制品/蛋奶/水果/干货'
  },
  unit: {
    type: DataTypes.STRING(10),
    defaultValue: '克',
    comment: '默认计量单位'
  }
}, {
  tableName: 'ingredients',
  indexes: [
    { fields: ['category'] },
    { fields: ['name'] }
  ]
});

module.exports = Ingredient;
