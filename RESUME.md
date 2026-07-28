# RESUME — 长任务恢复指南

## 当前状态
- **Batch 3 已完成**，测试 62/62 通过（41原有 + 8推荐 + 13安全）
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

## Batch 3 已完成事项
| 模块 | 状态 | 文件 |
|------|------|------|
| 数据质量审计 | ✅ | server/scripts/audit-data-quality.js + data/quality-report.json |
| 图片策略 | ✅ | server/scripts/generate-recipe-images.js + client/images/recipes/*.png(13张) |
| 前端图片兜底 | ✅ | recipe-card binderror→fallback.png |
| 图片来源清单 | ✅ | docs/IMAGE_SOURCES.md |
| 生产环境校验 | ✅ | config/index.js validateEnv + app.js启动调用 |
| 安全测试 | ✅ | server/tests/integration/security.test.js (13用例) |

## 数据质量结论
- 10000道菜: 无重复菜名/无缺步骤/无空字段/无HTML注入/营养数据合理
- 769条收藏数>浏览数(生成数据特征,轻微)
- 图片已全部替换为本地菜系占位图(备份: data/recipe.sqlite.bak-*, 变更记录: data/image-change-log.json)

## Batch 4 待办（下一批）
1. 部署验证: Docker镜像构建(环境无Docker则明确标记未验证)、健康检查、非root运行
2. 稳定性测试: 接口持续压测、内存/延迟趋势、SQLite并发
3. 性能基线: 启动时间、各接口p50/p95/p99
4. 最终交付物清单核对 + 上线检查清单 + 发布说明

## 关键架构决策（Batch3新增）
- 图片: 菜系确定性本地占位图(非真实照片), 前端binderror兜底, 上线前按IMAGE_SOURCES.md替换
- 环境校验: 生产环境弱JWT密钥/占位AppID拒绝启动, 错误只提示变量名不输出密钥值
- 数据审计: 只读脚本不修改数据, 修复需基于报告另行处理并保留备份

## 关键架构决策（Batch2新增）
- 推荐排除逻辑: 忌口食材+过敏原→RecipeIngredient反查recipe_id→Op.notIn; 素食按Ingredient.category排除
- 推荐理由: 基于实际匹配条件生成(菜系/时长/难度/收藏数/不辣)，不虚构
- 用量换算: WXS scale函数，数值型按比例缩放(>=10取整/1-10一位小数/<1两位)，非数值型(适量/少许)原样保留
- 做菜模式: wx.setKeepScreenOn屏幕常亮，步骤duration预设倒计时，结束震动+toast
