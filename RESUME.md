# RESUME — 长任务恢复指南

## 当前状态
- **发布候选 v1.0.0-rc.1 已冻结**（Git tag），测试 62/62 通过
- 已完成: 功能开发(Batch1-4) + 发布冻结/UAT/终审/演练/交付(Batch5-10)
- 最后更新: 2026-07-28
- 等待外部阻塞项解除后发布 v1.0.0 正式版

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

## Batch 4 已完成事项
| 模块 | 状态 | 文件 |
|------|------|------|
| Redis快速降级 | ✅ | config/redis.js (enableOfflineQueue=false), 热门接口1s→2ms |
| 限流可配置 | ✅ | config/index.js rateLimit + app.js, RATE_LIMIT_MAX |
| Docker加固 | ✅配置 | Dockerfile(非root+HEALTHCHECK) + .dockerignore(排除密钥) ⚠️daemon未运行未实际构建 |
| 性能测试 | ✅ | scripts/perf-test.js + data/perf-report.json |
| 上线检查清单 | ✅ | docs/LAUNCH_CHECKLIST.md |

## 性能基线（开发机SQLite无Redis）
- 热门1.9ms/推荐3.8ms/列表3.1ms/搜索43.5ms/详情258ms/分类1.2ms (p50)
- 稳定性: 60s 7130请求 100%成功 平均125.7RPS 无衰减

## 发布候选阶段成果 (Batch5-10)
| 模块 | 状态 | 文件 |
|------|------|------|
| RC冻结 | ✅ | Git tag v1.0.0-rc.1 + release-manifest.json + data-manifest.json |
| 变更日志/发布说明 | ✅ | CHANGELOG.md + RELEASE_NOTES.md |
| 上线阻塞项清单 | ✅ | 上线阻塞项清单.md |
| UAT验收 | ✅ 29/29 | docs/UAT_REPORT.md + data/uat-report.json |
| 推荐终审 | ✅ 9/9 | scripts/audit-recommendation.js + data/recommendation-audit.json |
| 高风险数据审计 | ✅ | scripts/audit-high-risk.js + data/high-risk-report.json |
| 安全终审 | ✅ | docs/SECURITY_AUDIT.md (权限矩阵21端点) |
| 备份恢复演练 | ✅ 真实执行 | scripts/backup-db.js + restore-db.js |
| 可观测性 | ✅ | middlewares/logger.js (requestId结构化日志) |
| 合规材料 | ✅ | PRIVACY_POLICY.md + USER_AGREEMENT.md + WECHAT_REVIEW_MATERIALS.md |
| 演示流程 | ✅ | docs/DEMO_FLOW.md |
| 最终交付报告 | ✅ | docs/FINAL_DELIVERY_REPORT.md |

## 外部阻塞项(非代码问题,解除后发v1.0.0)
1. 真实微信AppID/AppSecret → 真实登录联调
2. HTTPS+ICP备案域名 → 微信服务器域名配置
3. 微信开发者工具+真机 → UI/兼容性验证
4. Docker daemon → 实际构建/部署/回滚演练
5. 真实菜品图片 → 按docs/IMAGE_SOURCES.md替换

## 全部批次总览
| 批次 | 内容 | 状态 |
|------|------|------|
| Batch1 | TabBar图标/偏好页/注册天数/设计系统 | ✅ |
| Batch2 | 推荐个性化/搜索增强/详情换算/做菜模式 | ✅ |
| Batch3 | 数据审计/图片策略/环境校验/安全测试 | ✅ |
| Batch4 | Redis降级/限流/Docker加固/性能基线/上线清单 | ✅ |

## 关键架构决策（Batch4新增）
- Redis降级: enableOfflineQueue=false+maxRetriesPerRequest=1, 断线命令立即失败穿透DB, 后台重连恢复后缓存自动生效
- 限流: 可配置RATE_LIMIT_MAX, 生产300/min/IP
- Docker: 非root(appuser)+HEALTHCHECK+.dockerignore排除.env, 但daemon未运行未实际验证

## 关键架构决策（Batch3）
- 图片: 菜系确定性本地占位图(非真实照片), 前端binderror兜底, 上线前按IMAGE_SOURCES.md替换
- 环境校验: 生产环境弱JWT密钥/占位AppID拒绝启动, 错误只提示变量名不输出密钥值
- 数据审计: 只读脚本不修改数据, 修复需基于报告另行处理并保留备份

## 关键架构决策（Batch2新增）
- 推荐排除逻辑: 忌口食材+过敏原→RecipeIngredient反查recipe_id→Op.notIn; 素食按Ingredient.category排除
- 推荐理由: 基于实际匹配条件生成(菜系/时长/难度/收藏数/不辣)，不虚构
- 用量换算: WXS scale函数，数值型按比例缩放(>=10取整/1-10一位小数/<1两位)，非数值型(适量/少许)原样保留
- 做菜模式: wx.setKeepScreenOn屏幕常亮，步骤duration预设倒计时，结束震动+toast
