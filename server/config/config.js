/**
 * sequelize-cli 配置（用于生产环境 migration）
 */
require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123456',
  database: process.env.DB_NAME || 'recipe_db',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  dialect: 'mysql',
  define: { underscored: true, freezeTableName: true },
  timezone: '+08:00'
};

module.exports = {
  development: base,
  test: { ...base, database: `${base.database}_test` },
  production: base
};
