const express = require('express');
const authController = require('../controllers/authController');
const recipeController = require('../controllers/recipeController');
const categoryController = require('../controllers/categoryController');
const userController = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

const router = express.Router();

// ---------- 认证 ----------
router.post('/auth/wx-login', authController.wxLogin);
router.post('/auth/logout', requireAuth, authController.logout);

// ---------- 菜谱 ----------
// 注意：具体路径必须在 /recipes/:id 之前注册
router.get('/recipes/search', recipeController.search);
router.get('/recipes/popular', recipeController.popular);
router.get('/recipes/recommend', optionalAuth, recipeController.recommend);
router.get('/recipes', recipeController.list);
router.get('/recipes/:id/related', recipeController.related);
router.get('/recipes/:id', optionalAuth, recipeController.detail);
router.post('/recipes', requireAuth, recipeController.create);
router.put('/recipes/:id', requireAuth, recipeController.update);
router.delete('/recipes/:id', requireAuth, recipeController.remove);

// ---------- 分类 ----------
router.get('/categories', categoryController.tree);
router.get('/categories/:id/recipes', categoryController.recipes);

// ---------- 用户中心 ----------
router.get('/user/profile', requireAuth, userController.profile);
router.put('/user/profile', requireAuth, userController.updateProfile);
router.put('/user/preferences', requireAuth, userController.updatePreferences);

// ---------- 收藏 ----------
router.post('/favorites', requireAuth, userController.addFavorite);
router.delete('/favorites/:recipeId', requireAuth, userController.removeFavorite);
router.get('/favorites', requireAuth, userController.listFavorites);

// ---------- 浏览历史 ----------
router.get('/history', requireAuth, userController.listHistory);
router.delete('/history', requireAuth, userController.clearHistory);

module.exports = router;
