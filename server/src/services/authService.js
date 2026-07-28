const axios = require('axios');
const config = require('../config');
const { User } = require('../models');
const { signToken } = require('../middlewares/auth');

/**
 * 微信登录：code2session 换取 openid，创建/更新用户并签发 JWT
 */
const wxLogin = async (code, userInfo = {}) => {
  let openid;
  let unionid = null;

  if (config.env !== 'production' && code.startsWith('dev_')) {
    // 非生产环境：允许使用 dev_ 前缀的模拟 code，便于本地联调与测试
    openid = `dev_openid_${code.slice(4)}`;
  } else {
    const { data } = await axios.get(config.wechat.code2sessionUrl, {
      params: {
        appid: config.wechat.appId,
        secret: config.wechat.secret,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 5000
    });

    if (data.errcode) {
      const err = new Error(`微信登录失败: ${data.errmsg}`);
      err.status = 401;
      throw err;
    }
    openid = data.openid;
    unionid = data.unionid || null;
  }

  const [user, created] = await User.findOrCreate({
    where: { openid },
    defaults: {
      unionid,
      nickname: userInfo.nickname || '美食爱好者',
      avatar: userInfo.avatar || ''
    }
  });

  // 已存在用户时同步最新资料
  if (!created && (userInfo.nickname || userInfo.avatar)) {
    await user.update({
      nickname: userInfo.nickname || user.nickname,
      avatar: userInfo.avatar || user.avatar
    });
  }

  if (user.status === 0) {
    const err = new Error('账号已被禁用');
    err.status = 403;
    throw err;
  }

  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      preferences: user.preferences
    }
  };
};

module.exports = { wxLogin };
