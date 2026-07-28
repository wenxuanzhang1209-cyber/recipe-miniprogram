const redis = require('../config/redis');

/**
 * Redis 缓存工具 — 带优雅降级：Redis 不可用时直接穿透到数据库
 */
const cache = {
  async get(key) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      console.warn('[Cache] get failed:', err.message);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 3600) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      console.warn('[Cache] set failed:', err.message);
    }
  },

  async del(...keys) {
    try {
      if (keys.length) await redis.del(...keys);
    } catch (err) {
      console.warn('[Cache] del failed:', err.message);
    }
  },

  /** 按前缀批量删除（用于失效某类缓存） */
  async delByPattern(pattern) {
    try {
      // ioredis keyPrefix 不作用于 keys 命令的返回值处理，需手动拼接
      const prefix = redis.options.keyPrefix || '';
      const keys = await redis.keys(`${prefix}${pattern}`);
      if (keys.length) {
        // keys 返回值带前缀，del 时 ioredis 会再加一次前缀，需去掉
        const stripped = keys.map((k) => k.slice(prefix.length));
        await redis.del(...stripped);
      }
    } catch (err) {
      console.warn('[Cache] delByPattern failed:', err.message);
    }
  },

  /**
   * 缓存包装器：先查缓存，未命中执行 fn 并回填
   */
  async wrap(key, ttlSeconds, fn) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const result = await fn();
    if (result !== null && result !== undefined) {
      await this.set(key, result, ttlSeconds);
    }
    return result;
  }
};

module.exports = cache;
