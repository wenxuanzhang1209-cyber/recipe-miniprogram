# 上线检查清单

> 最后更新：2026-07-28 | 状态：开发完成，待上线配置

## 一、上线阻塞项（必须完成，否则无法上线）

| # | 项目 | 状态 | 说明 |
|---|------|------|------|
| 1 | 真实微信 AppID / AppSecret | ❌ 未完成 | 微信公众平台注册后获取，替换 `client/project.config.json` 的 appid 和 `server/.env` 的 WX_APPID/WX_SECRET |
| 2 | HTTPS + ICP 备案域名 | ❌ 未完成 | 小程序强制 HTTPS 且域名需备案，配置 `deploy/nginx.conf` 证书路径和域名 |
| 3 | 生产 JWT 强密钥 | ❌ 未完成 | 生成：`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`，写入生产 .env |
| 4 | 真实菜品图片 | ❌ 未完成 | 当前为菜系占位图，按 `docs/IMAGE_SOURCES.md` 替换为合法真实图片 |
| 5 | 微信后台服务器域名配置 | ❌ 未完成 | 微信公众平台 → 开发管理 → 服务器域名（request/download 合法域名） |

## 二、部署前自检（代码层面已完成）

| # | 项目 | 状态 | 验证方式 |
|---|------|------|----------|
| 1 | 后端依赖安装 | ✅ | `cd server && npm install` |
| 2 | 单元/集成测试 | ✅ 62/62 | `cd server && DB_DIALECT=sqlite npx jest --forceExit` |
| 3 | 数据质量审计 | ✅ | `node scripts/audit-data-quality.js`（无重复/缺失/注入） |
| 4 | 生产环境配置校验 | ✅ | 弱密钥/占位 AppID 会拒绝启动（validateEnv） |
| 5 | Dockerfile 非 root 运行 | ✅ 已配置 | 添加 appuser + USER 指令（⚠️ 未实际构建验证，Docker daemon 未运行） |
| 6 | Docker 健康检查 | ✅ 已配置 | HEALTHCHECK /health（⚠️ 未实际验证） |
| 7 | 密钥不入镜像 | ✅ 已配置 | .dockerignore 排除 .env |
| 8 | Redis 降级 | ✅ 已验证 | 断线时 2ms 快速穿透（测试覆盖） |
| 9 | 限流 | ✅ 已验证 | 300/min/IP，可配置 RATE_LIMIT_MAX |
| 10 | 权限隔离 | ✅ 已验证 | 水平越权测试覆盖 |

## 三、部署步骤

```bash
# 1. 服务器准备（Ubuntu/CentOS，2C4G+，安装 Docker + Docker Compose）

# 2. 上传代码，配置生产环境变量
cp server/.env.example server/.env
# 编辑 .env：NODE_ENV=production、真实数据库、强 JWT_SECRET、真实 WX_APPID/WX_SECRET

# 3. 构建并启动
docker compose up -d --build

# 4. 初始化数据
docker compose exec server npx sequelize-cli db:migrate
docker compose exec server npx sequelize-cli db:seed:all
docker compose exec server node scripts/generate-recipes.js 10000

# 5. 验证
curl https://your-domain.com/health
# 小程序开发者工具导入 client/，指向 https://your-domain.com/api/v1
```

## 四、上线后监控建议

- PM2 / Docker restart 策略保证进程存活
- 日志轮转（docker log-driver json-file + max-size）
- MySQL 定时备份（mysqldump cron）
- 关注 p95 延迟、错误率、Redis 命中率

## 五、已知限制与环境说明

| 限制 | 说明 |
|------|------|
| Docker 未实际构建验证 | 当前开发机 Docker daemon 未运行，Dockerfile/compose 已按最佳实践配置但未实际 build/run |
| 菜谱图片为占位图 | 菜系确定性本地占位图，非真实菜品照片，上线前必须替换 |
| 营养数据为估算 | 生成数据基于每100克营养估算，非精确值，前端已按"估算"展示 |
| 性能基线为开发机 | SQLite 本地测试，生产 MySQL + Redis 性能需另行压测 |

## 六、性能基线（开发机 SQLite，无 Redis 降级）

| 接口 | p50 | p95 | p99 |
|------|-----|-----|-----|
| 健康检查 | 0.4ms | 1.1ms | 1.2ms |
| 首页-热门 | 1.9ms | 2.5ms | 2.9ms |
| 首页-推荐 | 3.8ms | 5.6ms | 5.9ms |
| 菜谱列表 | 3.1ms | 4.1ms | 5.3ms |
| 搜索 | 43.5ms | 48.8ms | 49.0ms |
| 菜谱详情 | 258ms | 312ms | 313ms |
| 分类树 | 1.2ms | 3.8ms | 4.0ms |
| 相关推荐 | 6.6ms | 9.3ms | 9.5ms |

稳定性：60s 混合负载 7130 请求，成功率 100%，平均 125.7 RPS，无明显衰减。
详情见 `server/data/perf-report.json`。
