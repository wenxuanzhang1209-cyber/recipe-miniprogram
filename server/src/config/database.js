const { Sequelize } = require('sequelize');
const config = require('./index');

// 支持 SQLite 方言（本地开发/测试无 MySQL 时使用）: 设置 DB_DIALECT=sqlite
const dialect = process.env.DB_DIALECT || 'mysql';

const sequelize = dialect === 'sqlite'
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './data/recipe.sqlite',
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    })
  : new Sequelize(
      config.db.name,
      config.db.user,
      config.db.password,
      {
        host: config.db.host,
        port: config.db.port,
        dialect: 'mysql',
        pool: config.db.pool,
        logging: config.env === 'development' ? console.log : false,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        },
        timezone: '+08:00'
      }
    );

module.exports = sequelize;
