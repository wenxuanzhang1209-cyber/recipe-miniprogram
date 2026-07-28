const jwt = require('jsonwebtoken');
const config = require('../config');
const { fail } = require('../utils/response');

/**
 * JWT 鉴权中间件（必须登录）
 */
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, '未登录或登录已过期', 401, 401);
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.userId, openid: payload.openid };
    next();
  } catch (err) {
    return fail(res, '登录凭证无效，请重新登录', 401, 401);
  }
};

/**
 * 可选鉴权：有 token 则解析，无 token 也放行
 */
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      req.user = { id: payload.userId, openid: payload.openid };
    } catch (err) {
      // token 无效时按未登录处理
      req.user = null;
    }
  }
  next();
};

const signToken = (user) => {
  return jwt.sign(
    { userId: user.id, openid: user.openid },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = { requireAuth, optionalAuth, signToken };
