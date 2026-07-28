# 家常菜谱微信小程序 — 交接文档

## 项目概述

| 项         | 值                                                      |
| ---------- | ------------------------------------------------------- |
| 项目名称   | 家常菜谱微信小程序                                      |
| 技术栈     | 微信原生小程序 + Node.js 20 / Express 4 + MySQL 8 + Redis 7 |
| 数据规模   | 10,000 道菜谱 / 66,609 分步做法 / 96,908 食材关联       |
| API 端点   | 15 个 RESTful 接口，Swagger 文档可访问 `/api-docs`       |
| 测试       | 41/41 集成测试通过，语句覆盖率 81.3%                     |
| 项目路径   | `~/Desktop/recipe-miniprogram`                          |

---

## 目录结构

```
recipe-miniprogram/
├── client/              # 微信小程序前端（8 个页面）
│   ├── pages/
│   │   ├── index/       # 首页（轮播 + 推荐 + 分类入口）
│   │   ├── browse/      # 浏览页（无限滚动列表）
│   │   ├── search/      # 搜索页（菜名/描述/食材反查）
│   │   ├── detail/      # 菜谱详情（步骤/食材/营养/收藏/分享）
│   │   ├── category/    # 分类树（菜系/口味/做法/餐次）
│   │   ├── list/        # 分类结果列表
│   │   ├── user/        # 用户中心（收藏/历史/偏好）
│   │   └── login/       # 登录页
│   ├── components/      # 公共组件（recipe-card）
│   ├── styles/          # 设计系统（暖橙主题 CSS 变量）
│   ├── utils/           # 请求封装 + API 配置
│   ├── app.json         # 小程序全局配置
│   ├── app.wxss         # 全局样式
│   └── project.config.json  # ⚠️ 需替换 appid
│
├── server/              # 后端 API 服务
│   ├── src/
│   │   ├── controllers/ # 控制器层（recipe/user/category/auth）
│   │   ├── services/    # 业务逻辑层
│   │   ├── models/      # Sequelize 模型（12 个）
│   │   ├── routes/      # 路由定义
│   │   ├── middlewares/ # 鉴权/异常/校验中间件
│   │   ├── config/      # 数据库/Redis/OpenAPI 配置
│   │   ├── utils/       # 工具函数（响应格式/缓存）
│   │   └── app.js       # Express 入口
│   ├── scripts/
│   │   └── generate-recipes.js  # 万级数据生成脚本
│   ├── migrations/      # 生产数据库迁移
│   ├── seeders/         # 基础分类/标签种子数据
│   ├── tests/           # 集成测试（3 套件 41 用例）
│   ├── .env             # ⚠️ 需替换微信 AppID/AppSecret
│   ├── .env.example     # 环境变量模板
│   ├── package.json
│   ├── jest.config.js
│   └── Dockerfile
│
├── deploy/
│   └── nginx.conf       # Nginx 反向代理（HTTPS/gzip）
│
├── docs/
│   ├── API.md           # 全部接口文档
│   ├── DATABASE.md      # 数据库设计（ER 图 + 12 表结构）
│   ├── DEPLOYMENT.md    # 部署指南
│   └── USER_MANUAL.md   # 用户使用手册
│
├── docker-compose.yml   # MySQL 8 + Redis 7 + API 编排
└── README.md
```

---

## 已完成工作

### Phase 1 — 工程脚手架 ✅
- [x] client/server 前后端分离结构
- [x] Express 中间件链：helmet 安全头、请求限流（300次/分/IP）、gzip 压缩
- [x] 12 个 Sequelize 模型及多对多关联
- [x] Docker Compose 编排（MySQL 8 + Redis 7 + Node API）
- [x] 健康检查端点 `/health`

### Phase 2 — 万级数据生成 ✅
- [x] 基于真实中餐规律组合生成 10,000 道唯一菜谱
- [x] 每道菜含：分步做法、食材用量、小贴士、营养估算
- [x] 70+ 主料 × 12 烹饪方式 × 9 菜系 × 10 口味
- [x] 数据已入库验证 `Recipe.count() === 10000`

### Phase 3 — 后端 API ✅
- [x] 微信登录（code2session + JWT），非生产环境支持 `dev_` 模拟码
- [x] 菜谱列表（分页/筛选/排序）、详情、搜索、热门推荐、相关推荐
- [x] 分类树接口（菜系/口味/做法/餐次）
- [x] 用户中心：收藏（幂等）、浏览历史（upsert）、偏好设置
- [x] Redis 缓存（热门/分类），连接失败自动降级穿透
- [x] 统一错误处理、JWT 鉴权中间件

### Phase 4 — 小程序前端 ✅
- [x] 8 个页面完整实现（wxml/wxss/js/json 四件套）
- [x] 暖橙设计系统（CSS 变量、圆角、阴影规范）
- [x] 骨架屏加载态、无限滚动、筛选抽屉
- [x] 收藏/分享/浏览历史、可勾选备菜清单

### Phase 5 — 集成测试 ✅
- [x] Jest + Supertest，SQLite 内存库隔离测试
- [x] 41/41 测试通过，81.3% 语句覆盖率
- [x] 覆盖：登录/JWT/401/分页/筛选/搜索/收藏幂等/历史/CRUD/404

### Phase 6 — 部署与文档 ✅
- [x] Swagger UI 挂载于 `/api-docs`（15 路径）
- [x] Nginx HTTPS 反向代理配置
- [x] 生产 migration + seeder
- [x] 4 份交付文档（API / 数据库 / 部署 / 用户手册）

---

## 待完成工作（上线前必须完成）

### 🔴 P0 — 必须完成，否则无法运行

| # | 任务 | 说明 | 涉及文件 |
|---|------|------|----------|
| 1 | **替换微信 AppID / AppSecret** | 在微信公众平台注册小程序后获取，替换以下两处 | `client/project.config.json` 的 `appid` 字段；`server/.env` 的 `WX_APPID` 和 `WX_SECRET` |
| 2 | **安装后端依赖** | `cd server && npm install` | — |
| 3 | **启动数据库与服务** | 方式一：`docker-compose up -d`（推荐）<br>方式二：本地 MySQL 8 + Redis 7，然后 `npm run dev` | `docker-compose.yml` 或 `server/.env` |
| 4 | **初始化数据库** | `npx sequelize-cli db:migrate` + `npx sequelize-cli db:seed:all`<br>或 `node scripts/generate-recipes.js` | `server/migrations/`、`server/seeders/` |

### 🟡 P1 — 上线前必须完成

| # | 任务 | 说明 | 涉及文件 |
|---|------|------|----------|
| 5 | **HTTPS + ICP 备案域名** | 微信小程序强制要求 HTTPS 且域名需 ICP 备案 | `deploy/nginx.conf` 替换证书路径和域名 |
| 6 | **替换占位图为真实菜品图片** | 当前使用 picsum.photos 随机占位，需替换为真实图片上传 OSS/COS | `server/scripts/generate-recipes.js` 图片生成逻辑 |
| 7 | **配置微信后台服务器域名** | 微信公众平台 → 开发管理 → 服务器域名 | 微信后台操作 |
| 8 | **生产环境 .env 调整** | `NODE_ENV=production`，配真实数据库连接，生成强 `JWT_SECRET` | `server/.env` |

### 🟢 P2 — 建议完成，提升质量

| # | 任务 | 说明 |
|---|------|------|
| 9  | 真实菜品图片拍摄/采购 | 建议至少覆盖热门 500 道菜 |
| 10 | 性能压测 | 用 k6/wrk 模拟并发，验证缓存命中率 |
| 11 | 日志与监控 | PM2 + logrotate 或 ELK/Loki |
| 12 | 数据备份策略 | MySQL 定时 mysqldump，Redis AOF |
| 13 | 小程序审核提交 | 完善简介、截图、类目，提交审核 |
| 14 | HTTPS 证书自动续期 | certbot + Let's Encrypt |
| 15 | CDN 加速 | 图片资源接入 CDN |

---

## 快速启动步骤

```bash
# 1. 进入项目目录
cd ~/Desktop/recipe-miniprogram

# 2. 安装后端依赖
cd server && npm install

# 3. 修改配置（替换为你的真实 AppID/AppSecret）
nano .env

# 4. Docker 一键启动
cd .. && docker-compose up -d

# 5. 初始化数据
docker-compose exec server npx sequelize-cli db:migrate
docker-compose exec server npx sequelize-cli db:seed:all
docker-compose exec server node scripts/generate-recipes.js

# 6. 验证服务
curl http://localhost:3000/health

# 7. 微信开发者工具 → 导入 client/ 目录
```

---

## 技术架构速览

```
┌─────────────────┐     HTTPS      ┌──────────────┐
│  微信小程序      │ ──────────────→ │    Nginx     │
│  (client/)      │                 │  (反向代理)   │
└─────────────────┘                 └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │  Node.js API  │
                                    │  (Express 4)  │
                                    └──┬────────┬──┘
                                       │        │
                                ┌──────▼──┐  ┌──▼───────┐
                                │ MySQL 8  │  │ Redis 7  │
                                │ (主存储)  │  │ (缓存)   │
                                └─────────┘  └──────────┘
```

---

## 文档索引

| 文档 | 内容 |
|------|------|
| `docs/API.md` | 全部 15 个接口的请求参数、响应格式、示例 |
| `docs/DATABASE.md` | ER 关系图、12 张表结构、索引策略 |
| `docs/DEPLOYMENT.md` | 服务器准备、Docker 部署、Nginx 配置、微信后台设置 |
| `docs/USER_MANUAL.md` | 小程序功能操作说明、FAQ |
