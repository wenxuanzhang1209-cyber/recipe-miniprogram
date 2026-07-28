# API 接口文档

Base URL: `http://<host>:3000/api/v1`

## 统一响应格式

```json
// 成功
{ "code": 0, "message": "success", "data": { ... } }

// 分页
{
  "code": 0, "message": "success",
  "data": {
    "list": [ ... ],
    "pagination": { "total": 10000, "page": 1, "limit": 20, "totalPages": 500, "hasMore": true }
  }
}

// 失败（HTTP 状态码与 code 一致）
{ "code": 404, "message": "菜谱不存在", "data": null }
```

## 鉴权

需要登录的接口请携带请求头：`Authorization: Bearer <token>`
token 由登录接口返回，有效期 7 天。失效返回 `401`。

---

## 1. 认证

### POST /auth/wx-login
微信登录。前端 `wx.login()` 获取 code 后调用。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | wx.login 返回的临时凭证；非生产环境支持 `dev_` 前缀模拟码 |
| nickname | string | 否 | 昵称 |
| avatar | string | 否 | 头像 URL |

返回：`{ token, user: { id, nickname, avatar, preferences } }`

### POST /auth/logout 🔒
退出登录（JWT 无状态，前端删除本地 token 即可）。

---

## 2. 菜谱

### GET /recipes
菜谱列表（分页 + 筛选 + 排序）。

| 参数 | 说明 |
|------|------|
| page / limit | 分页，limit 最大 100 |
| cuisine | 菜系：川菜/粤菜/鲁菜/苏菜/浙菜/闽菜/湘菜/徽菜/家常菜 |
| taste | 口味：咸鲜/麻辣/香辣/酸甜/酸辣/甜咸/清淡/酱香/蒜香/糖醋 |
| method | 做法：炒/炖/蒸/煮/煎/烤/炸/拌/焖/烧/卤/汤 |
| difficulty | 难度 1-5 |
| maxTime | 总时长上限（分钟） |
| sort | newest（默认）/ popular / favorite / quickest / easiest |

### GET /recipes/search
关键词搜索（匹配菜名、描述、食材名）。参数：`keyword`（必填）、`page`、`limit`、`cuisine`、`difficulty`。

### GET /recipes/popular
热门菜谱。参数：`limit`（默认 10）。Redis 缓存 15 分钟。

### GET /recipes/recommend
推荐菜谱。登录用户基于最近浏览的菜系偏好推荐；未登录返回随机热门。参数：`limit`。

### GET /recipes/:id
菜谱详情，返回完整信息：

```json
{
  "id": 666, "name": "香辣豆角", "cover_image": "...",
  "description": "...", "cuisine_type": "川菜", "taste": "香辣",
  "cooking_method": "煎", "difficulty": 4,
  "prep_time": 13, "cook_time": 15, "total_time": 28,
  "servings": 2, "calories": 66, "tips": "...",
  "view_count": 1200, "favorite_count": 300, "is_favorited": false,
  "ingredients": [{ "name": "豆角", "amount": "300克", "is_main": true }],
  "steps": [{ "step_number": 1, "description": "...", "image_url": "...", "duration": 4 }],
  "nutrition": { "calories": 66, "protein": 5, "fat": 8, "carbs": 10, "fiber": 3, "sodium": 500 },
  "tags": [{ "id": 1, "name": "下饭菜" }],
  "categories": [ ... ]
}
```

调用后自动 +1 浏览量；登录用户自动记录浏览历史。

### GET /recipes/:id/related
相关菜谱（同菜系或同做法）。参数：`limit`（默认 6）。

### POST /recipes 🔒
创建菜谱。body 支持嵌套 `steps`、`ingredients`、`nutrition`。

### PUT /recipes/:id 🔒
更新菜谱基本字段。

### DELETE /recipes/:id 🔒
删除菜谱（级联删除步骤/食材关联/营养/收藏/历史）。

---

## 3. 分类

### GET /categories
分类树，按类型分组返回：`{ cuisine: [], taste: [], method: [], meal: [], ingredient: [] }`。Redis 缓存 2 小时。

### GET /categories/:id/recipes
该分类下的菜谱（分页）。

---

## 4. 用户中心 🔒

### GET /user/profile
个人资料 + 统计：`{ id, nickname, avatar, preferences, stats: { favoriteCount, historyCount } }`

### PUT /user/profile
更新资料。参数：`nickname`、`avatar`、`phone`。

### PUT /user/preferences
更新偏好（增量合并）。body 任意 JSON 键值。

---

## 5. 收藏 🔒

| 接口 | 说明 |
|------|------|
| POST /favorites | body: `{ recipeId }`，收藏（幂等） |
| DELETE /favorites/:recipeId | 取消收藏 |
| GET /favorites | 收藏列表（分页） |

---

## 6. 浏览历史 🔒

| 接口 | 说明 |
|------|------|
| GET /history | 浏览历史（分页，按时间倒序） |
| DELETE /history | 清空历史 |

---

## 限流

`/api` 下所有接口：每 IP 每分钟 300 次，超出返回 `429`。
