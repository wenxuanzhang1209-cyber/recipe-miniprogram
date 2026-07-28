const { fail } = require('../utils/response');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.message, err.stack);

  // Sequelize 校验错误
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors?.map((e) => e.message).join('; ') || '数据校验失败';
    return fail(res, message, 422, 422);
  }

  // Joi / express-validator 校验错误
  if (err.isJoi || err.status === 422) {
    return fail(res, err.message || '参数校验失败', 422, 422);
  }

  // 已知业务错误（带 status）
  if (err.status && err.status < 500) {
    return fail(res, err.message, err.status, err.status);
  }

  return fail(res, '服务器内部错误', 500, 500);
};

/**
 * 404 处理
 */
const notFound = (req, res) => {
  return fail(res, `接口不存在: ${req.method} ${req.path}`, 404, 404);
};

/**
 * async 路由包装器，自动捕获异常
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFound, asyncHandler };
