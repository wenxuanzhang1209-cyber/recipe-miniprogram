// components/recipe-card/index.js
const FALLBACK_IMG = '/images/recipes/fallback.png';

Component({
  properties: {
    recipe: { type: Object, value: {} },
    // grid: 网格卡片; list: 横向列表条
    mode: { type: String, value: 'grid' }
  },

  data: {
    imgSrc: FALLBACK_IMG
  },

  observers: {
    'recipe.cover_image': function (src) {
      // 空图/无效图直接用兜底图
      this.setData({ imgSrc: src || FALLBACK_IMG });
    }
  },

  lifetimes: {
    attached() {
      const src = this.data.recipe && this.data.recipe.cover_image;
      this.setData({ imgSrc: src || FALLBACK_IMG });
    }
  },

  methods: {
    onTap() {
      const id = this.data.recipe.id;
      if (!id) return;
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    },
    // 图片加载失败 → 本地兜底图
    onImgError() {
      if (this.data.imgSrc !== FALLBACK_IMG) {
        this.setData({ imgSrc: FALLBACK_IMG });
      }
    }
  }
});
