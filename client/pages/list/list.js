// pages/list/list.js - 分类菜谱列表页
const api = require('../../utils/api');

Page({
  data: {
    categoryId: null,
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    firstLoading: true
  },

  onLoad(options) {
    this.setData({ categoryId: options.categoryId });
    if (options.title) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(options.title) });
    }
    this.fetchList(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchList(false);
    }
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => wx.stopPullDownRefresh());
  },

  async fetchList(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true, page });

    try {
      const res = await api.getCategoryRecipes(this.data.categoryId, { page, limit: 20 });
      this.setData({
        list: reset ? res.list : this.data.list.concat(res.list),
        hasMore: res.pagination.hasMore,
        loading: false,
        firstLoading: false
      });
    } catch (e) {
      this.setData({ loading: false, firstLoading: false });
    }
  }
});
