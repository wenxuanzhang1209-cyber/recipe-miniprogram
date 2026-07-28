require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'recipe_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123456',
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
    keyPrefix: 'recipe:'
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  wechat: {
    appId: process.env.WX_APPID || '',
    secret: process.env.WX_SECRET || '',
    code2sessionUrl: 'https://api.weixin.qq.com/sns/jscode2session'
  },

  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    localPath: './uploads',
    oss: {
      region: process.env.OSS_REGION || '',
      bucket: process.env.OSS_BUCKET || '',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || ''
    }
  },

  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100
  },

  cache: {
    defaultTTL: 3600,       // 1 hour
    recipesTTL: 1800,       // 30 minutes
    categoriesTTL: 7200,    // 2 hours
    popularTTL: 900         // 15 minutes
  }
};
