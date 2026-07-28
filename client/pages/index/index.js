// pages/index/index.js - 首页
const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    banners: [],
    quickCats: [],
    recommends: [],
    populars: []
  },

  onLoad() {
    this.fetchAll();
  },

  onShow() {
    // 偏好设置变更后刷新推荐
    if (this._prefsDirty) {
      this._prefsDirty = false;
      this.fetchAll();
    }
  },

  onPullDownRefresh() {
    this.fetchAll().finally(() => wx.stopPullDownRefresh());
  },

  async fetchAll() {
    this.setData({ loading: true });
    try {
      const [popular, recommend, categories] = await Promise.all([
        api.getPopular(10),
        api.getRecommend(6),
        api.getCategories()
      ]);

      // 轮播用热门前5
      const banners = popular.slice(0, 5);
      // 快捷分类：菜系 8 个
      const quickCats = (categories.cuisine || []).slice(0, 8);

      this.setData({
        banners,
        populars: popular.slice(5),
        recommends: recommend,
        quickCats,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  goBanner(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  goCategory(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/list/list?categoryId=${id}&title=${name}` });
  },

  goBrowse() {
    wx.switchTab({ url: '/pages/browse/browse' });
  }
});
