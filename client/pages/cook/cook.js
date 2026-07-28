// pages/cook/cook.js - 做菜模式（沉浸式分步引导）
const api = require('../../utils/api');

Page({
  data: {
    id: null,
    loading: true,
    recipe: null,
    steps: [],
    ingredients: [],
    current: 0,          // 当前步骤索引
    total: 0,
    showIngredients: false,

    // 计时器
    timerRunning: false,
    timerSeconds: 0,
    timerDisplay: '00:00'
  },

  _timerInterval: null,

  onLoad(options) {
    const id = options.id;
    this.setData({ id });
    this.fetchRecipe(id);
    // 屏幕常亮（做菜时防止息屏）
    wx.setKeepScreenOn({ keepScreenOn: true });
  },

  onUnload() {
    this.stopTimer();
    wx.setKeepScreenOn({ keepScreenOn: false });
  },

  onHide() {
    // 页面隐藏时暂停计时，避免后台空转
    if (this.data.timerRunning) this.pauseTimer();
  },

  async fetchRecipe(id) {
    try {
      const recipe = await api.getRecipeDetail(id);
      const steps = recipe.steps || [];
      const ingredients = (recipe.ingredients || []).map((i) => `${i.name} ${i.amount}${i.unit || ''}`);
      this.setData({
        recipe, steps, ingredients,
        total: steps.length,
        current: 0,
        loading: false
      });
      wx.setNavigationBarTitle({ title: `做菜 · ${recipe.name}` });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '菜谱加载失败', icon: 'none' });
    }
  },

  // ---------- 步骤切换 ----------
  prevStep() {
    if (this.data.current > 0) {
      this.setData({ current: this.data.current - 1 });
      this.resetTimerForStep();
    }
  },

  nextStep() {
    if (this.data.current < this.data.total - 1) {
      this.setData({ current: this.data.current + 1 });
      this.resetTimerForStep();
    } else {
      this.finishCooking();
    }
  },

  // 切换步骤时，若该步骤有时长建议则预设计时
  resetTimerForStep() {
    this.stopTimer();
    const step = this.data.steps[this.data.current];
    const dur = step && step.duration ? parseInt(step.duration, 10) : 0;
    this.setData({ timerSeconds: dur > 0 ? dur * 60 : 0, timerDisplay: this.fmt(dur > 0 ? dur * 60 : 0), timerRunning: false });
  },

  // ---------- 计时器 ----------
  fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  startTimer() {
    if (this.data.timerSeconds <= 0) {
      wx.showToast({ title: '该步骤无建议时长', icon: 'none' });
      return;
    }
    if (this.data.timerRunning) return;
    this.setData({ timerRunning: true });
    this._timerInterval = setInterval(() => {
      const next = this.data.timerSeconds - 1;
      if (next <= 0) {
        this.stopTimer();
        this.setData({ timerSeconds: 0, timerDisplay: '00:00' });
        wx.vibrateLong({ fail: () => {} });
        wx.showToast({ title: '⏰ 计时结束', icon: 'none', duration: 2500 });
        return;
      }
      this.setData({ timerSeconds: next, timerDisplay: this.fmt(next) });
    }, 1000);
  },

  pauseTimer() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = null;
    this.setData({ timerRunning: false });
  },

  stopTimer() {
    this.pauseTimer();
  },

  toggleTimer() {
    if (this.data.timerRunning) this.pauseTimer();
    else this.startTimer();
  },

  // ---------- 食材快速查看 ----------
  toggleIngredients() {
    this.setData({ showIngredients: !this.data.showIngredients });
  },

  // ---------- 完成 ----------
  finishCooking() {
    wx.showModal({
      title: '🎉 大功告成',
      content: `${this.data.recipe.name} 做好啦，快去享用吧！`,
      showCancel: false,
      confirmText: '返回菜谱',
      success: () => wx.navigateBack()
    });
  },

  exitCook() {
    wx.navigateBack();
  }
});
