// components/recipe-card/index.js
Component({
  properties: {
    recipe: { type: Object, value: {} },
    // grid: 网格卡片; list: 横向列表条
    mode: { type: String, value: 'grid' }
  },

  methods: {
    onTap() {
      const id = this.data.recipe.id;
      if (!id) return;
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    }
  }
});
