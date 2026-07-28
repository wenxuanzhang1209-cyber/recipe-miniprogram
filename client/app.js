// app.js - 全局应用逻辑
App({
  globalData: {
    baseUrl: 'http://localhost:3000/api/v1', // 生产环境替换为 https 域名
    token: '',
    userInfo: null
  },

  onLaunch() {
    // 恢复本地登录态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo || null;
    }
  },

  // 是否已登录
  isLoggedIn() {
    return !!this.globalData.token;
  },

  // 保存登录态
  setLogin(token, userInfo) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
  },

  // 清除登录态
  clearLogin() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  }
});
