# RESUME — 长任务恢复指南

## 当前状态
- **Batch 2 已完成**，测试 49/49 通过（41原有 + 8推荐联动）
- 最后更新: 2026-07-28

## 下一条可直接执行的命令

```bash
cd "/Users/wenxuanzhang/Desktop/Vibe Coding/recipe-miniprogram/server" && DB_DIALECT=sqlite npx jest --forceExit
```

## 环境注意事项
1. **npm 依赖已安装**（node_modules 存在于 server/ 下）
2. 如需重新安装依赖：项目路径含空格，node-gyp 编译 sqlite3 会失败。解决方案：
   ```bash
   cp -R server /tmp/server-build && cd /tmp/server-build && npm install --cache /tmp/npm-cache-tmp
   # 安装成功后: npm approve-scripts sqlite3 fsevents @scarf/scarf && npm install --cache /tmp/npm-cache-tmp
   # 然后移回: mv /tmp/server-build/node_modules server/node_modules
   ```
3. 运行服务器: `cd server && DB_DIALECT=sqlite npm run dev`
4. 运行测试: `cd server && DB_DIALECT=sqlite npx jest --forceExit`
5. 生成图标: `cd client && node scripts/generate-icons.js`

## Batch 1 已完成事项
| 模块 | 状态 | 文件 |
|------|------|------|
| npm环境修复 | ✅ | server/node_modules |
| TabBar图标(8个)+品牌资源 | ✅ | client/images/*.png, client/scripts/generate-icons.js |
| app.json tabBar iconPath | ✅ | client/app.json |
| 偏好设置页面 | ✅ | client/pages/preferences/* (4文件) |
| 偏好入口+注册天数 | ✅ | client/pages/user/user.{js,wxml,wxss} |
| 设计系统拆分 | ✅ | client/styles/{tokens,base}.wxss, client/app.wxss |

## Batch 2 已完成事项
| 模块 | 状态 | 文件 |
|------|------|------|
| 推荐系统真实个性化 | ✅ | server/src/services/recipeService.js (getRecommendedRecipes重写) |
| 推荐理由生成 | ✅ | recipeService.buildRecommendReason + recipe-card展示 |
| 搜索防抖+过期请求丢弃 | ✅ | client/pages/search/search.js |
| 搜索无结果建议 | ✅ | search.wxml/wxss |
| 详情页人数换算 | ✅ | detail.js + utils/scale.wxs (WXS干净数字) |
| 过敏原提示 | ✅ | detail.js checkAllergens + detail.wxml |
| 做菜模式 | ✅ | client/pages/cook/* (4文件) |
| 退出登录调后端 | ✅ | user.js + api.js logout |
| 偏好推荐联动测试 | ✅ | server/tests/integration/recommend-prefs.test.js (8用例) |

## Batch 3 待办（下一批）
1. 数据质量审计脚本（菜名重复/分类错误/步骤缺失/用量异常/营养不可信）+报告
2. 图片策略：清理picsum.photos、本地兜底图、图片来源清单
3. 后端性能/安全加固：索引、N+1、并发安全、JWT强密钥校验、输入校验
4. 补充测试：收藏并发、权限隔离、Redis降级、搜索边界

## 关键架构决策（Batch2新增）
- 推荐排除逻辑: 忌口食材+过敏原→RecipeIngredient反查recipe_id→Op.notIn; 素食按Ingredient.category排除
- 推荐理由: 基于实际匹配条件生成(菜系/时长/难度/收藏数/不辣)，不虚构
- 用量换算: WXS scale函数，数值型按比例缩放(>=10取整/1-10一位小数/<1两位)，非数值型(适量/少许)原样保留
- 做菜模式: wx.setKeepScreenOn屏幕常亮，步骤duration预设倒计时，结束震动+toast
