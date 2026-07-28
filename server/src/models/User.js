const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  openid: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: '微信openid'
  },
  unionid: {
    type: DataTypes.STRING(64),
    defaultValue: null,
    comment: '微信unionid'
  },
  nickname: {
    type: DataTypes.STRING(50),
    defaultValue: '美食爱好者',
    comment: '昵称'
  },
  avatar: {
    type: DataTypes.STRING(500),
    defaultValue: '',
    comment: '头像URL'
  },
  phone: {
    type: DataTypes.STRING(20),
    defaultValue: '',
    comment: '手机号'
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '用户偏好设置'
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '状态: 1正常 0禁用'
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['openid'] },
    { fields: ['unionid'] }
  ]
});

module.exports = User;
