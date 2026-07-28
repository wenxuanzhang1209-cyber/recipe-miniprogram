const Redis = require('ioredis');
const config = require('./index');

/**
 * Redis 客户端 — 快速降级配置
 * 关键：enableOfflineQueue=false + maxRetriesPerRequest=1
 *  - Redis 断开时，命令立即 reject（不排队等待），cache 层捕获后穿透到 DB
 *  - 避免“Redis 宕机时每个请求都被拖慢 1s+”的问题
 *  - retryStrategy 仍在后台重连，Redis 恢复后缓存自动生效
 */
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  connectTimeout: 2000,
  enableOfflineQueue: false,   // 断线时命令立即失败，不排队
  maxRetriesPerRequest: 1,     // 每个命令最多重试1次，快速失败
  retryStrategy(times) {
    if (times > 20) return null; // 超过20次停止重连（避免无限重试日志风暴）
    return Math.min(times * 200, 3000);
  }
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', () => {
  // 静默降级：不打印堆栈避免日志风暴，cache 层会 warn
});

module.exports = redis;
