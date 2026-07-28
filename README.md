# 家常菜谱微信小程序

一个功能完整的做菜教材/菜谱微信小程序，内置 **10,000+ 道家常菜** 数据。

## 项目结构

```
recipe-miniprogram/
├── client/              # 微信小程序（原生开发）
├── server/              # Node.js + Express 后端 API
├── docker-compose.yml   # MySQL + Redis + Server 一键编排
└── docs/                # 文档（API / 数据库 / 部署 / 用户手册）
```

## 功能清单

### 小程序端
- **首页**：搜索栏、热门轮播、菜系快捷入口、今日推荐、热门榜单
- **菜谱浏览**：网格/列表视图切换、菜系 Tab、5 种排序、筛选抽屉（难度/时长）、无限滚动分页
- **搜索**：菜名/描述/食材多维搜索、搜索历史、热门关键词
- **菜谱详情**：大图、可勾选食材备菜清单、时间轴式分步做法、小贴士、营养成分卡、猜你喜欢、收藏与分享
- **分类页**：菜系/口味/做法/餐次 四维分类导航
- **用户中心**：微信一键登录、收藏列表、浏览历史、退出登录
- **体验优化**：骨架屏、下拉刷新、淡入动画、懒加载图片

### 后端
- RESTful API（Express + Sequelize + MySQL + Redis）
- 微信授权登录（code2session）+ JWT 鉴权
- 菜谱 CRUD、多条件筛选、全文搜索（菜名/描述/食材反查）
- 分类树、个性化推荐（基于浏览偏好）、相关推荐
- 收藏、浏览历史、用户偏好设置
- Redis 缓存热点数据（带优雅降级，Redis 不可用时自动穿透）
- 限流、Helmet 安全头、统一错误处理

## 快速开始

### 方式一：Docker（推荐，含 MySQL + Redis）

```bash
cd recipe-miniprogram
docker compose up -d
# 生成 10000 道菜谱数据
docker compose exec server node scripts/generate-recipes.js 10000
```

### 方式二：本地开发（无需 MySQL，使用 SQLite）

```bash
cd server
npm install
# 生成数据（首次）
DB_DIALECT=sqlite node scripts/generate-recipes.js 10000
# 启动服务
DB_DIALECT=sqlite npm run dev
```

服务默认运行在 `http://localhost:3000`，健康检查：`GET /health`。

### 小程序端

1. 用微信开发者工具打开 `client/` 目录
2. 修改 `client/app.js` 中的 `baseUrl` 为你的后端地址
3. 开发阶段在工具中勾选「不校验合法域名」
4. 上线前将 `project.config.json` 中 `appid` 替换为你的小程序 AppID

## 测试

```bash
cd server
npm test    # 41 个集成测试（Jest + Supertest，SQLite 内存库）
```

## 文档

- [API 接口文档](docs/API.md)
- [数据库设计文档](docs/DATABASE.md)
- [部署指南](docs/DEPLOYMENT.md)
- [用户使用手册](docs/USER_MANUAL.md)

## 技术栈

| 层 | 技术 |
|----|------|
| 小程序 | 微信原生（WXML/WXSS/JS） |
| 后端 | Node.js 20 + Express 4 |
| ORM | Sequelize 6 |
| 数据库 | MySQL 8.0（生产）/ SQLite（开发测试） |
| 缓存 | Redis 7（ioredis） |
| 认证 | JWT + 微信 code2session |
| 测试 | Jest + Supertest |
| 部署 | Docker Compose + Nginx |
