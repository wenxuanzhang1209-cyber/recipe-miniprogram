// pages/detail/detail.js - 菜谱详情页
const api = require('../../utils/api');

/**
 * 用量换算：
 * - 数值型（"400克" "2个" "1.5勺"）按比例缩放，输出干净数字
 * - 非数值型（"适量" "少许" "一点点"）原样保留
 */
function scaleAmount(amount, ratio) {
  if (!amount || ratio === 1) return amount || '';
  const m = String(amount).match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return amount; // 非数值，不换算
  const num = parseFloat(m[1]);
  const suffix = m[2] || '';
  if (isNaN(num)) return amount;
  const scaled = num * ratio;
  // 干净数字：>=10 取整；1~10 保留一位小数并去掉 .0；<1 保留两位
  let out;
  if (scaled >= 10) out = Math.round(scaled);
  else if (scaled >= 1) out = (Math.round(scaled * 10) / 10).toString();
  else out = (Math.round(scaled * 100) / 100).toString();
  return out + suffix;
}

Page({
  data: {
    id: null,
    loading: true,
    recipe: null,
    mainIngredients: [],
    subIngredients: [],
    related: [],
    checkedMap: {},       // 食材勾选状态

    // 人数换算
    baseServings: 1,      // 菜谱原始份量
    currentServings: 1,   // 当前选择份量
    servingsRatio: 1,

    // 过敏原提示
    allergenWarnings: []
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ id });
    this.fetchDetail(id);
    this.fetchRelated(id);
    this.loadUserServings();
  },

  // 读取用户偏好中的每餐人数 + 过敏原
  async loadUserServings() {
    if (!getApp().isLoggedIn()) return;
    try {
      const profile = await api.getProfile();
      const prefs = profile.preferences || {};
      this._allergens = Array.isArray(prefs.allergens) ? prefs.allergens : [];
      if (prefs.servings && this.data.recipe) {
        this.applyServings(prefs.servings);
      } else if (prefs.servings) {
        this._pendingServings = prefs.servings;
      }
    } catch (e) { /* 未登录或加载失败，用菜谱默认份量 */ }
  },

  async fetchDetail(id) {
    try {
      const recipe = await api.getRecipeDetail(id);
      const mainIngredients = (recipe.ingredients || []).filter((i) => i.is_main);
      const subIngredients = (recipe.ingredients || []).filter((i) => !i.is_main);
      const baseServings = recipe.servings || 1;
      this.setData({
        recipe, mainIngredients, subIngredients, loading: false,
        baseServings, currentServings: baseServings, servingsRatio: 1
      });
      wx.setNavigationBarTitle({ title: recipe.name });
      // 过敏原检测
      this.checkAllergens(recipe.ingredients || []);
      // 应用用户默认人数
      const target = this._pendingServings || baseServings;
      if (target !== baseServings) this.applyServings(target);
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  // 过敏原提示：匹配食材名与分类
  checkAllergens(ingredients) {
    const allergens = this._allergens || [];
    if (!allergens.length) return;
    const hits = [];
    ingredients.forEach((ing) => {
      allergens.forEach((a) => {
        if ((ing.name && ing.name.includes(a)) || (ing.category && ing.category.includes(a))) {
          hits.push(`${ing.name}（含${a}）`);
        }
      });
    });
    this.setData({ allergenWarnings: [...new Set(hits)] });
  },

  async fetchRelated(id) {
    try {
      const related = await api.getRelated(id, 6);
      this.setData({ related });
    } catch (e) { /* 静默失败 */ }
  },

  // ---------- 人数换算 ----------
  applyServings(n) {
    const baseServings = this.data.baseServings || 1;
    const currentServings = Math.max(1, Math.min(12, n));
    const servingsRatio = currentServings / baseServings;
    this.setData({ currentServings, servingsRatio });
  },

  onServingsTap(e) {
    const delta = parseInt(e.currentTarget.dataset.delta, 10);
    this.applyServings(this.data.currentServings + delta);
  },

  // 食材勾选（备菜清单）
  toggleCheck(e) {
    const name = e.currentTarget.dataset.name;
    const key = `checkedMap.${name}`;
    this.setData({ [key]: !this.data.checkedMap[name] });
  },

  // ---------- 做菜模式 ----------
  goCookMode() {
    wx.navigateTo({ url: `/pages/cook/cook?id=${this.data.id}` });
  },

  async onFavorite() {
    const app = getApp();
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const { recipe } = this.data;
    // 乐观更新前先防重复点击
    if (this._favLock) return;
    this._favLock = true;
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
    finally { this._favLock = false; }
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

// 导出供 WXS 使用的换算函数（WXML 中通过 wxs 调用）
module.exports = { scaleAmount };
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
