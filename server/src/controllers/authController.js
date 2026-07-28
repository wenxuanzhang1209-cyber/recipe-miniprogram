const authService = require('../services/authService');
const { success, fail } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');

/**
 * POST /api/v1/auth/wx-login
 * body: { code, nickname?, avatar? }
 */
const wxLogin = asyncHandler(async (req, res) => {
  const { code, nickname, avatar } = req.body;
  if (!code) return fail(res, '缺少参数 code', 422, 422);

  const result = await authService.wxLogin(code, { nickname, avatar });
  return success(res, result, '登录成功');
});

/**
 * POST /api/v1/auth/logout
 * JWT 无状态，前端删除 token 即可；此接口用于埋点/审计
 */
const logout = asyncHandler(async (req, res) => {
  return success(res, null, '已退出登录');
});

module.exports = { wxLogin, logout };
