const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BrowseHistory = sequelize.define('BrowseHistory', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  recipe_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  viewed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '浏览时间'
  }
}, {
  tableName: 'browse_history',
  indexes: [
    { fields: ['user_id', 'viewed_at'] },
    { unique: true, fields: ['user_id', 'recipe_id'] }
  ]
});

module.exports = BrowseHistory;
