'use strict';

/**
 * 基础分类与标签种子数据
 * 大批量菜谱数据请使用: node scripts/generate-recipes.js 10000
 */
const CUISINES = ['川菜', '粤菜', '鲁菜', '苏菜', '浙菜', '闽菜', '湘菜', '徽菜', '家常菜'];
const TASTES = ['咸鲜', '麻辣', '香辣', '酸甜', '酸辣', '甜咸', '清淡', '酱香', '蒜香', '糖醋'];
const METHODS = ['炒', '炖', '蒸', '煮', '煎', '烤', '炸', '拌', '焖', '烧', '卤', '汤'];
const MEALS = ['早餐', '午餐', '晚餐', '下午茶', '夜宵'];

const TAGS = [
  ...['快手菜', '下饭菜', '宴客菜', '下酒菜', '深夜食堂', '便当菜', '早餐', '夜宵'].map((n) => ({ name: n, type: 'scene' })),
  ...['儿童喜爱', '老人适宜', '孕妇餐', '健身餐', '减脂餐'].map((n) => ({ name: n, type: 'crowd' })),
  ...['春季时令', '夏季清爽', '秋季滋补', '冬季暖身'].map((n) => ({ name: n, type: 'season' })),
  ...['高蛋白', '低脂', '补钙', '养胃', '快捷', '经典名菜', '新手必学', '零失败'].map((n) => ({ name: n, type: 'general' }))
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const cat = (name, type, i) => ({
      name, type, icon: '🍲', sort_order: i, parent_id: null, created_at: now, updated_at: now
    });

    await queryInterface.bulkInsert('categories', [
      ...CUISINES.map((n, i) => cat(n, 'cuisine', i)),
      ...TASTES.map((n, i) => cat(n, 'taste', i)),
      ...METHODS.map((n, i) => cat(n, 'method', i)),
      ...MEALS.map((n, i) => cat(n, 'meal', i))
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('tags',
      TAGS.map((t) => ({ ...t, created_at: now, updated_at: now })),
      { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('tags', null, {});
  }
};
