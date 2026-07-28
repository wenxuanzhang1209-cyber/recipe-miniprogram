// pages/login/login.js - 登录页
const api = require('../../utils/api');

Page({
  data: {
    loading: false
  },

  onWxLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    wx.login({
      success: async (res) => {
        if (!res.code) {
          this.setData({ loading: false });
          wx.showToast({ title: '微信登录失败', icon: 'none' });
          return;
        }
        try {
          const result = await api.wxLogin(res.code);
          getApp().setLogin(result.token, result.user);
          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 800);
        } catch (e) {
          // 错误 toast 已由 request 统一处理
        } finally {
          this.setData({ loading: false });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  }
});
