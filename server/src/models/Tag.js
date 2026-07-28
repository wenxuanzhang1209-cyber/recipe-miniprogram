const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: '标签名称'
  },
  type: {
    type: DataTypes.STRING(20),
    defaultValue: 'general',
    comment: '标签类型: general/scene/crowd/season'
  }
}, {
  tableName: 'tags',
  indexes: [
    { fields: ['type'] },
    { unique: true, fields: ['name', 'type'] }
  ]
});

module.exports = Tag;
