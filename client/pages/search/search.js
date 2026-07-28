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
    loading: false,
    noResult: false       // 无结果状态
  },

  // 请求序号：用于丢弃过期响应（防止慢请求覆盖快请求）
  _reqSeq: 0,
  _debounceTimer: null,

  onLoad() {
    this.setData({ history: wx.getStorageSync(HISTORY_KEY) || [] });
  },

  onUnload() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  },

  onInput(e) {
    const val = e.detail.value;
    this.setData({ keyword: val });
    // 输入防抖 400ms：边输边搜，减少无效请求
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (val.trim()) {
      this._debounceTimer = setTimeout(() => this.doSearch(val), 400);
    }
  },

  onConfirm() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
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
    const seq = ++this._reqSeq;
    this.setData({ loading: true, searched: true, page });

    try {
      const res = await api.searchRecipes({ keyword: kw, page, limit: 20 });
      // 过期请求丢弃：只采纳最新一次请求的结果
      if (seq !== this._reqSeq) return;
      const list = reset ? res.list : this.data.list.concat(res.list);
      this.setData({
        list,
        hasMore: res.pagination.hasMore,
        noResult: reset && list.length === 0,
        loading: false
      });
    } catch (e) {
      if (seq !== this._reqSeq) return;
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    if (this.data.searched && this.data.hasMore && !this.data.loading) {
      this.doSearch(this.data.keyword, false);
    }
  },

  clearKeyword() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._reqSeq++; // 作废所有在途请求
    this.setData({ keyword: '', searched: false, list: [], noResult: false });
  },

  // 无结果时推荐热门词
  onTapSuggest(e) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw, noResult: false });
    this.doSearch(kw);
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
