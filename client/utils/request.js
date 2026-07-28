// utils/request.js - 封装 HTTP 请求
const request = (url, options = {}) => {
  const app = getApp();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(app.globalData.token ? { Authorization: `Bearer ${app.globalData.token}` } : {})
      },
      success: (res) => {
        // 401 统一处理：清除登录态并跳转登录
        if (res.statusCode === 401) {
          app.clearLogin();
          wx.navigateTo({ url: '/pages/login/login' });
          return reject(new Error('请先登录'));
        }
        if (res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          const msg = (res.data && res.data.message) || '请求失败';
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        reject(err);
      }
    });
  });
};

const get = (url, data) => request(url, { method: 'GET', data });
const post = (url, data) => request(url, { method: 'POST', data });
const put = (url, data) => request(url, { method: 'PUT', data });
const del = (url, data) => request(url, { method: 'DELETE', data });

module.exports = { request, get, post, put, del };
