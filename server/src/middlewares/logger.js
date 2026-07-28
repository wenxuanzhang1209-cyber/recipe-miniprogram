const crypto = require('crypto');

/**
 * 请求日志中间件 — 结构化日志 + requestId 链路追踪
 *
 * 记录：requestId / method / 路由 / 状态码 / 耗时 / userId（如已登录）
 * 安全：不记录 token、微信 code、AppSecret 等敏感信息
 * 慢请求：超过 1000ms 标记为 SLOW 便于告警
 */
const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex');
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const userId = req.user ? req.user.id : '-';
    const slow = durationMs > 1000 ? ' SLOW' : '';

    // 结构化日志（生产环境可接入 ELK/Loki 解析）
    const logLine = JSON.stringify({
      ts: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId,
      method: req.method,
      route: req.baseUrl + (req.route ? req.route.path : req.path),
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      userId,
      ip: req.ip
    });

    if (res.statusCode >= 500) console.error(`[req]${slow} ${logLine}`);
    else if (slow) console.warn(`[req] SLOW ${logLine}`);
    else if (process.env.NODE_ENV !== 'test') console.log(`[req] ${logLine}`);
  });

  next();
};

module.exports = { requestLogger };
