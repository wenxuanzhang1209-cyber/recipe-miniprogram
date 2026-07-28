// pages/search/search.js - 搜索页
const api = require('../../utils/api');

const HISTORY_KEY = 'search_history';
const HOT_KEYWORDS = ['红烧肉', '可乐鸡翅', '番茄炒蛋', '麻婆豆腐', '清蒸鲈鱼', '酸辣土豆丝', '糖醋排骨', '宫保鸡丁'];

Page({
  data: {
    keyword: '',
    history: [],
    hotKeywords: HOT_KEYWORDS,

    searched: false,
    list: [],
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.setData({ history: wx.getStorageSync(HISTORY_KEY) || [] });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onConfirm() {
    this.doSearch(this.data.keyword);
  },

  onTapKeyword(e) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw });
    this.doSearch(kw);
  },

  async doSearch(keyword, reset = true) {
    const kw = (keyword || '').trim();
    if (!kw) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
      return;
    }

    // 记录搜索历史（去重、最多10条）
    if (reset) {
      const history = [kw, ...this.data.history.filter((h) => h !== kw)].slice(0, 10);
      wx.setStorageSync(HISTORY_KEY, history);
      this.setData({ history });
    }

    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true, searched: true, page });

    try {
      const res = await api.searchRecipes({ keyword: kw, page, limit: 20 });
      this.setData({
        list: reset ? res.list : this.data.list.concat(res.list),
        hasMore: res.pagination.hasMore,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    if (this.data.searched && this.data.hasMore && !this.data.loading) {
      this.doSearch(this.data.keyword, false);
    }
  },

  clearKeyword() {
    this.setData({ keyword: '', searched: false, list: [] });
  },

  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(HISTORY_KEY);
          this.setData({ history: [] });
        }
      }
    });
  }
});
