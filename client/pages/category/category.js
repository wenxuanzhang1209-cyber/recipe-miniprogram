// pages/category/category.js - 分类页
const api = require('../../utils/api');

const TYPE_TABS = [
  { key: 'cuisine', label: '菜系' },
  { key: 'taste', label: '口味' },
  { key: 'method', label: '做法' },
  { key: 'meal', label: '餐次' }
];

Page({
  data: {
    typeTabs: TYPE_TABS,
    activeType: 'cuisine',
    grouped: {},        // { cuisine: [], taste: [], ... }
    currentList: [],
    loading: true
  },

  onLoad() {
    this.fetchCategories();
  },

  async fetchCategories() {
    try {
      const grouped = await api.getCategories();
      this.setData({
        grouped,
        currentList: grouped[this.data.activeType] || [],
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onTypeTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      activeType: key,
      currentList: this.data.grouped[key] || []
    });
  },

  goList(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/list/list?categoryId=${id}&title=${name}` });
  }
});
