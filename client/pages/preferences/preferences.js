// pages/preferences/preferences.js - 饮食偏好设置
const api = require('../../utils/api');

const CUISINES = ['川菜', '粤菜', '鲁菜', '苏菜', '浙菜', '闽菜', '湘菜', '徽菜', '家常菜', '东北菜', '西北菜', '云贵菜'];
const SPICE_LEVELS = [
  { key: 'none', label: '不吃辣', icon: '🫑' },
  { key: 'mild', label: '微辣', icon: '🌶' },
  { key: 'medium', label: '中辣', icon: '🌶🌶' },
  { key: 'heavy', label: '重辣', icon: '🌶🌶🌶' }
];
const DIET_GOALS = [
  { key: 'balanced', label: '均衡饮食', desc: '荤素搭配，营养全面' },
  { key: 'lowfat', label: '低脂轻食', desc: '少油少炸，清爽健康' },
  { key: 'lowcarb', label: '低碳水', desc: '减少米面主食摄入' },
  { key: 'highprotein', label: '高蛋白', desc: '增肌健身蛋白质优先' },
  { key: 'quick', label: '快手省时', desc: '30分钟内搞定一餐' }
];
const DIET_TYPES = [
  { key: 'omnivore', label: '荤素不忌' },
  { key: 'pescatarian', label: '鱼素（不吃红肉）' },
  { key: 'vegetarian', label: '蛋奶素' },
  { key: 'vegan', label: '纯素' }
];
const ALLERGENS = ['海鲜', '花生', '坚果', '鸡蛋', '牛奶', '大豆', '小麦(麸质)', '芝麻'];
const EQUIPMENT = ['炒锅', '蒸锅', '汤锅', '煎锅', '电饭煲', '空气炸锅', '烤箱', '微波炉', '高压锅', '破壁机'];
const MAX_TIMES = [
  { value: 15, label: '15分钟内' },
  { value: 30, label: '30分钟内' },
  { value: 45, label: '45分钟内' },
  { value: 60, label: '1小时内' },
  { value: 90, label: '1.5小时内' },
  { value: 0, label: '不限时间' }
];
const COMMON_AVOID = ['香菜', '葱', '姜', '蒜', '辣椒', '花椒', '八角', '香菜/芹菜', '内脏', '肥肉'];

const DEFAULT_PREFS = {
  cuisines: [],
  avoidIngredients: [],
  spiceLevel: '',
  dietGoal: '',
  dietType: '',
  allergens: [],
  difficulties: [],
  maxCookTime: 0,
  equipment: [],
  servings: 2
};

Page({
  data: {
    loading: true,
    saving: false,
    dirty: false,

    cuisines: CUISINES,
    spiceLevels: SPICE_LEVELS,
    dietGoals: DIET_GOALS,
    dietTypes: DIET_TYPES,
    allergenOptions: ALLERGENS,
    equipmentOptions: EQUIPMENT,
    maxTimeOptions: MAX_TIMES,
    commonAvoid: COMMON_AVOID,

    prefs: { ...DEFAULT_PREFS },
    avoidInput: '',
    showAvoidSuggestions: false
  },

  onLoad() {
    this.fetchPreferences();
  },

  async fetchPreferences() {
    this.setData({ loading: true });
    try {
      const profile = await api.getProfile();
      const saved = profile.preferences || {};
      // 合并默认值，兼容旧数据缺字段
      const prefs = { ...DEFAULT_PREFS };
      Object.keys(DEFAULT_PREFS).forEach((k) => {
        if (saved[k] !== undefined && saved[k] !== null) prefs[k] = saved[k];
      });
      // 类型校验
      if (!Array.isArray(prefs.cuisines)) prefs.cuisines = [];
      if (!Array.isArray(prefs.avoidIngredients)) prefs.avoidIngredients = [];
      if (!Array.isArray(prefs.allergens)) prefs.allergens = [];
      if (!Array.isArray(prefs.difficulties)) prefs.difficulties = [];
      if (!Array.isArray(prefs.equipment)) prefs.equipment = [];
      if (typeof prefs.servings !== 'number' || prefs.servings < 1) prefs.servings = 2;
      if (typeof prefs.maxCookTime !== 'number') prefs.maxCookTime = 0;

      this.setData({ prefs, loading: false });
      this._original = JSON.stringify(prefs);
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载偏好失败，请重试', icon: 'none' });
    }
  },

  markDirty() {
    if (!this.data.dirty) this.setData({ dirty: true });
  },

  // ---------- 菜系多选 ----------
  toggleCuisine(e) {
    const name = e.currentTarget.dataset.name;
    const prefs = this.data.prefs;
    const idx = prefs.cuisines.indexOf(name);
    if (idx >= 0) prefs.cuisines.splice(idx, 1);
    else if (prefs.cuisines.length >= 5) {
      wx.showToast({ title: '最多选择5个菜系', icon: 'none' });
      return;
    } else prefs.cuisines.push(name);
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 辣度 ----------
  onSpiceTap(e) {
    const key = e.currentTarget.dataset.key;
    const prefs = this.data.prefs;
    prefs.spiceLevel = prefs.spiceLevel === key ? '' : key;
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 饮食目标 ----------
  onGoalTap(e) {
    const key = e.currentTarget.dataset.key;
    const prefs = this.data.prefs;
    prefs.dietGoal = prefs.dietGoal === key ? '' : key;
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 荤素偏好 ----------
  onDietTypeTap(e) {
    const key = e.currentTarget.dataset.key;
    const prefs = this.data.prefs;
    prefs.dietType = prefs.dietType === key ? '' : key;
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 过敏原 ----------
  toggleAllergen(e) {
    const name = e.currentTarget.dataset.name;
    const prefs = this.data.prefs;
    const idx = prefs.allergens.indexOf(name);
    if (idx >= 0) prefs.allergens.splice(idx, 1);
    else prefs.allergens.push(name);
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 忌口食材 ----------
  onAvoidInput(e) {
    const val = e.detail.value;
    const suggestions = val.trim()
      ? COMMON_AVOID.filter((s) => s.includes(val.trim()) && !this.data.prefs.avoidIngredients.includes(s))
      : [];
    this.setData({ avoidInput: val, showAvoidSuggestions: suggestions.length > 0, avoidSuggestions: suggestions });
  },

  addAvoidTag(e) {
    const name = (e.currentTarget.dataset.name || this.data.avoidInput).trim();
    if (!name) return;
    if (name.length > 10) {
      wx.showToast({ title: '食材名过长', icon: 'none' });
      return;
    }
    const prefs = this.data.prefs;
    if (prefs.avoidIngredients.includes(name)) {
      wx.showToast({ title: '已在忌口列表中', icon: 'none' });
      return;
    }
    if (prefs.avoidIngredients.length >= 20) {
      wx.showToast({ title: '最多添加20项忌口食材', icon: 'none' });
      return;
    }
    prefs.avoidIngredients.push(name);
    this.setData({ prefs, avoidInput: '', showAvoidSuggestions: false });
    this.markDirty();
  },

  // 常见忌口快捷切换
  toggleAvoidQuick(e) {
    const name = e.currentTarget.dataset.name;
    const prefs = this.data.prefs;
    const idx = prefs.avoidIngredients.indexOf(name);
    if (idx >= 0) prefs.avoidIngredients.splice(idx, 1);
    else prefs.avoidIngredients.push(name);
    this.setData({ prefs });
    this.markDirty();
  },

  removeAvoidTag(e) {
    const name = e.currentTarget.dataset.name;
    const prefs = this.data.prefs;
    prefs.avoidIngredients = prefs.avoidIngredients.filter((i) => i !== name);
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 难度 ----------
  toggleDifficulty(e) {
    const val = parseInt(e.currentTarget.dataset.value, 10);
    const prefs = this.data.prefs;
    const idx = prefs.difficulties.indexOf(val);
    if (idx >= 0) prefs.difficulties.splice(idx, 1);
    else prefs.difficulties.push(val);
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 时长 ----------
  onMaxTimeTap(e) {
    const value = parseInt(e.currentTarget.dataset.value, 10);
    const prefs = this.data.prefs;
    prefs.maxCookTime = prefs.maxCookTime === value ? 0 : value;
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 厨具 ----------
  toggleEquipment(e) {
    const name = e.currentTarget.dataset.name;
    const prefs = this.data.prefs;
    const idx = prefs.equipment.indexOf(name);
    if (idx >= 0) prefs.equipment.splice(idx, 1);
    else prefs.equipment.push(name);
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 人数 ----------
  onServingsChange(e) {
    const delta = parseInt(e.currentTarget.dataset.delta, 10);
    const prefs = this.data.prefs;
    const next = prefs.servings + delta;
    if (next < 1 || next > 12) return;
    prefs.servings = next;
    this.setData({ prefs });
    this.markDirty();
  },

  // ---------- 保存 ----------
  async onSave() {
    if (this.data.saving) return;
    const { prefs } = this.data;

    // 前端校验
    if (prefs.servings < 1 || prefs.servings > 12) {
      wx.showToast({ title: '用餐人数需在1-12之间', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      await api.updatePreferences(prefs);
      this._original = JSON.stringify(prefs);
      this.setData({ saving: false, dirty: false });
      wx.showToast({ title: '偏好已保存', icon: 'success' });
      // 通知首页刷新推荐
      const pages = getCurrentPages();
      const indexPage = pages.find((p) => p.route === 'pages/index/index');
      if (indexPage && indexPage.fetchAll) {
        indexPage._prefsDirty = true;
      }
    } catch (e) {
      this.setData({ saving: false });
      // 提供重试
      wx.showModal({
        title: '保存失败',
        content: '网络异常，是否重试？',
        confirmText: '重试',
        success: (res) => { if (res.confirm) this.onSave(); }
      });
    }
  },

  // ---------- 重置 ----------
  onReset() {
    wx.showModal({
      title: '恢复默认',
      content: '确定清空全部偏好设置吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ prefs: JSON.parse(JSON.stringify(DEFAULT_PREFS)) });
          this.markDirty();
        }
      }
    });
  },

  // 页面卸载时如有未保存变更提示
  onUnload() {
    // 微信小程序无法阻止返回，仅做记录
  }
});
