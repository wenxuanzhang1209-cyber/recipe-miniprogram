// pages/detail/detail.js - 菜谱详情页
const api = require('../../utils/api');

Page({
  data: {
    id: null,
    loading: true,
    recipe: null,
    mainIngredients: [],
    subIngredients: [],
    related: [],
    checkedMap: {}   // 食材勾选状态
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ id });
    this.fetchDetail(id);
    this.fetchRelated(id);
  },

  async fetchDetail(id) {
    try {
      const recipe = await api.getRecipeDetail(id);
      const mainIngredients = (recipe.ingredients || []).filter((i) => i.is_main);
      const subIngredients = (recipe.ingredients || []).filter((i) => !i.is_main);
      this.setData({ recipe, mainIngredients, subIngredients, loading: false });
      wx.setNavigationBarTitle({ title: recipe.name });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  async fetchRelated(id) {
    try {
      const related = await api.getRelated(id, 6);
      this.setData({ related });
    } catch (e) { /* 静默失败 */ }
  },

  // 食材勾选（备菜清单）
  toggleCheck(e) {
    const name = e.currentTarget.dataset.name;
    const key = `checkedMap.${name}`;
    this.setData({ [key]: !this.data.checkedMap[name] });
  },

  async onFavorite() {
    const app = getApp();
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const { recipe } = this.data;
    try {
      if (recipe.is_favorited) {
        await api.removeFavorite(recipe.id);
        this.setData({
          'recipe.is_favorited': false,
          'recipe.favorite_count': Math.max(0, recipe.favorite_count - 1)
        });
        wx.showToast({ title: '已取消收藏', icon: 'none' });
      } else {
        await api.addFavorite(recipe.id);
        this.setData({
          'recipe.is_favorited': true,
          'recipe.favorite_count': recipe.favorite_count + 1
        });
        wx.showToast({ title: '收藏成功 ❤️', icon: 'none' });
      }
    } catch (e) { /* toast 已由 request 统一处理 */ }
  },

  onShareAppMessage() {
    const { recipe } = this.data;
    return {
      title: recipe ? `${recipe.name} - 详细做法` : '家常菜谱',
      path: `/pages/detail/detail?id=${this.data.id}`,
      imageUrl: recipe ? recipe.cover_image : ''
    };
  }
});
