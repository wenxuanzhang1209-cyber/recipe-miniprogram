const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/error');
const { requestLogger } = require('./middlewares/logger');

const app = express();

// ---------- 基础中间件 ----------
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 结构化请求日志（requestId 链路追踪）
app.use(requestLogger);

if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
}

// ---------- 限流 ----------
app.use('/api', rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '请求过于频繁，请稍后再试', data: null }
}));

// ---------- 健康检查 ----------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ---------- Swagger API 文档 ----------
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./config/openapi');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));

// ---------- API 路由 ----------
app.use('/api/v1', routes);

// ---------- 错误处理 ----------
app.use(notFound);
app.use(errorHandler);

// ---------- 启动 ----------
const start = async () => {
  // 生产环境配置必填校验（弱密钥/占位值拒绝启动）
  config.validateEnv();

  const { sequelize } = require('./models');
  try {
    await sequelize.authenticate();
    console.log('[MySQL] Connected successfully');
    // 开发环境自动同步表结构；生产环境请使用 migration
    if (config.env === 'development') {
      await sequelize.sync();
      console.log('[MySQL] Tables synced');
    }
  } catch (err) {
    console.error('[MySQL] Connection failed:', err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`[Server] Running at http://localhost:${config.port} (${config.env})`);
  });
};

// 测试环境仅导出 app，不启动监听
if (require.main === module) {
  start();
}

module.exports = app;
