require('dotenv').config();

const config = {
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

  rateLimit: {
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300  // 每IP每分钟最大请求数
  },

  cache: {
    defaultTTL: 3600,       // 1 hour
    recipesTTL: 1800,       // 30 minutes
    categoriesTTL: 7200,    // 2 hours
    popularTTL: 900         // 15 minutes
  }
};

/**
 * 生产环境启动前必填校验。
 * 原则：
 *  - 缺少真实配置时快速失败，不带着弱密钥/占位值上线
 *  - 错误信息只提示变量名，不输出密钥实际值（防日志泄露）
 *  - 开发/测试环境允许使用默认值（但会告警）
 * 强密钥生成: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
 */
const validateEnv = () => {
  const isProd = config.env === 'production';
  const errors = [];
  const warnings = [];

  const WEAK_SECRETS = ['default-secret-change-me', 'recipe-miniprogram-dev-secret-2024', 'change-me-in-production', ''];
  if (WEAK_SECRETS.includes(config.jwt.secret)) {
    if (isProd) errors.push('JWT_SECRET 为弱密钥/占位值，生产环境必须替换为强随机密钥');
    else warnings.push('JWT_SECRET 使用开发默认值（仅允许非生产环境）');
  } else if (isProd && config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET 长度不足 32 字符，生产环境需使用强密钥');
  }

  if (isProd) {
    if (!config.wechat.appId || config.wechat.appId.includes('placeholder')) {
      errors.push('WX_APPID 未配置或为占位值');
    }
    if (!config.wechat.secret || config.wechat.secret.includes('placeholder')) {
      errors.push('WX_SECRET 未配置或为占位值');
    }
    if (config.db.password === 'root123456') {
      warnings.push('DB_PASSWORD 为默认值，建议使用独立强密码');
    }
  }

  warnings.forEach((w) => console.warn(`[config] ⚠️  ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`[config] ❌ ${e}`));
    console.error('[config] 生产环境配置校验未通过，拒绝启动。请检查 .env（参考 .env.example）');
    process.exit(1);
  }
};

module.exports = config;
module.exports.validateEnv = validateEnv;
