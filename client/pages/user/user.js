// pages/user/user.js - 用户中心
const api = require('../../utils/api');

Page({
  data: {
    isLoggedIn: false,
    profile: null,
    joinDaysText: '',

    activeTab: 'favorites',   // favorites | history
    favorites: [],
    history: [],
    favPage: 1,
    hisPage: 1,
    favHasMore: true,
    hisHasMore: true,
    loading: false
  },

  onShow() {
    const app = getApp();
    const isLoggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn });
    if (isLoggedIn) {
      this.fetchProfile();
      this.fetchFavorites(true);
      this.fetchHistory(true);
    }
  },

  async fetchProfile() {
    try {
      const profile = await api.getProfile();
      this.setData({ profile, joinDaysText: this.calcJoinDays(profile.created_at) });
    } catch (e) { /* 401 已统一处理 */ }
  },

  /**
   * 计算注册天数 — 处理边界情况：
   * - 无效/空时间 → 不显示
   * - 当天注册 → “今天加入”
   * - 跨时区 → 统一用本地日期差
   */
  calcJoinDays(createdAt) {
    if (!createdAt) return '欢迎加入家常菜谱';
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return '欢迎加入家常菜谱';
    const now = new Date();
    // 按自然日计算（本地时区）
    const d1 = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((d2 - d1) / 86400000);
    if (days <= 0) return '今天加入，开始探索美味吧';
    return `爱下厨的第 ${days} 天`;
  },

  goPreferences() {
    wx.navigateTo({ url: '/pages/preferences/preferences' });
  },

  async fetchFavorites(reset) {
    const page = reset ? 1 : this.data.favPage + 1;
    try {
      const res = await api.getFavorites({ page, limit: 10 });
      this.setData({
        favorites: reset ? res.list : this.data.favorites.concat(res.list),
        favPage: page,
        favHasMore: res.pagination.hasMore
      });
    } catch (e) { /* ignore */ }
  },

  async fetchHistory(reset) {
    const page = reset ? 1 : this.data.hisPage + 1;
    try {
      const res = await api.getHistory({ page, limit: 10 });
      this.setData({
        history: reset ? res.list : this.data.history.concat(res.list),
        hisPage: page,
        hisHasMore: res.pagination.hasMore
      });
    } catch (e) { /* ignore */ }
  },

  onReachBottom() {
    const { activeTab, favHasMore, hisHasMore } = this.data;
    if (activeTab === 'favorites' && favHasMore) this.fetchFavorites(false);
    if (activeTab === 'history' && hisHasMore) this.fetchHistory(false);
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空全部浏览历史吗？',
      success: async (res) => {
        if (res.confirm) {
          await api.clearHistory();
          this.setData({ history: [], hisHasMore: false });
          this.fetchProfile();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().clearLogin();
          this.setData({
            isLoggedIn: false,
            profile: null,
            favorites: [],
            history: []
          });
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      }
    });
  }
});
