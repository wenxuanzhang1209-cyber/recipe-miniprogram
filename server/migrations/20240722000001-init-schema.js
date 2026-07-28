'use strict';

/**
 * 初始建表 migration：与 src/models 定义保持一致
 * 复用模型的 sequelize.sync 能力，保证 DDL 与模型单一事实来源
 */
module.exports = {
  async up(queryInterface) {
    // 通过模型定义同步建表（含索引），避免手写 DDL 与模型漂移
    const { sequelize } = require('../src/models');
    await sequelize.sync();
  },

  async down(queryInterface) {
    // 逆序删除，规避外键依赖
    const tables = [
      'recipe_tags', 'recipe_categories', 'recipe_ingredients', 'recipe_steps',
      'nutritional_info', 'favorites', 'browse_history',
      'tags', 'categories', 'ingredients', 'recipes', 'users'
    ];
    for (const t of tables) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  }
};
