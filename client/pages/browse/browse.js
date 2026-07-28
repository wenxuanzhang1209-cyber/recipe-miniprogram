// pages/browse/browse.js - 菜谱浏览页
const api = require('../../utils/api');

const CUISINES = ['全部', '川菜', '粤菜', '鲁菜', '苏菜', '浙菜', '闽菜', '湘菜', '徽菜', '家常菜'];
const SORTS = [
  { key: 'newest', label: '最新' },
  { key: 'popular', label: '最热' },
  { key: 'favorite', label: '收藏最多' },
  { key: 'quickest', label: '最省时' },
  { key: 'easiest', label: '最简单' }
];
const DIFFICULTIES = ['不限', '1', '2', '3', '4', '5'];
const MAX_TIMES = [
  { label: '不限', value: '' },
  { label: '15分钟内', value: 15 },
  { label: '30分钟内', value: 30 },
  { label: '60分钟内', value: 60 }
];

Page({
  data: {
    cuisines: CUISINES,
    sorts: SORTS,
    difficulties: DIFFICULTIES,
    maxTimes: MAX_TIMES,

    viewMode: 'grid',       // grid | list
    showFilter: false,

    // 筛选状态
    activeCuisine: '全部',
    activeSort: 'newest',
    activeDifficulty: '不限',
    activeMaxTime: '',

    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    firstLoading: true
  },

  onLoad() {
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

  buildParams() {
    const { activeCuisine, activeSort, activeDifficulty, activeMaxTime, page } = this.data;
    const params = { page, limit: 20, sort: activeSort };
    if (activeCuisine !== '全部') params.cuisine = activeCuisine;
    if (activeDifficulty !== '不限') params.difficulty = activeDifficulty;
    if (activeMaxTime) params.maxTime = activeMaxTime;
    return params;
  },

  async fetchList(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true, page });

    try {
      const res = await api.getRecipes(this.buildParams());
      this.setData({
        list: reset ? res.list : this.data.list.concat(res.list),
        hasMore: res.pagination.hasMore,
        loading: false,
        firstLoading: false
      });
    } catch (e) {
      this.setData({ loading: false, firstLoading: false });
    }
  },

  toggleView() {
    this.setData({ viewMode: this.data.viewMode === 'grid' ? 'list' : 'grid' });
  },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  onCuisineTap(e) {
    this.setData({ activeCuisine: e.currentTarget.dataset.value });
    this.fetchList(true);
  },

  onSortTap(e) {
    this.setData({ activeSort: e.currentTarget.dataset.value });
    this.fetchList(true);
  },

  onDifficultyTap(e) {
    this.setData({ activeDifficulty: e.currentTarget.dataset.value });
  },

  onMaxTimeTap(e) {
    this.setData({ activeMaxTime: e.currentTarget.dataset.value });
  },

  applyFilter() {
    this.setData({ showFilter: false });
    this.fetchList(true);
  },

  resetFilter() {
    this.setData({ activeDifficulty: '不限', activeMaxTime: '', activeCuisine: '全部' });
  },

  stopBubble() {}
});
