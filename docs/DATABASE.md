# 数据库设计文档

数据库：MySQL 8.0（utf8mb4），开发/测试环境可切换 SQLite（`DB_DIALECT=sqlite`）。
ORM：Sequelize（underscored 命名，自动维护 `created_at` / `updated_at`）。

## ER 关系总览

```
users ──< favorites >── recipes ──< recipe_steps
  │                        │
  └──< browse_history >────┤──< recipe_ingredients >── ingredients
                           │──< recipe_categories >── categories (自关联 parent_id)
                           │──< recipe_tags >── tags
                           └──1 nutritional_info
```

## 表结构

### recipes（菜谱主表，10000+ 行）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT UNSIGNED PK AI | |
| name | VARCHAR(100) | 菜名，有索引 |
| cover_image | VARCHAR(500) | 封面图 URL |
| description | TEXT | 菜品描述 |
| cuisine_type | VARCHAR(20) | 菜系（索引） |
| taste | VARCHAR(20) | 口味（索引） |
| cooking_method | VARCHAR(20) | 烹饪方式（索引） |
| difficulty | TINYINT | 难度 1-5（索引） |
| prep_time | INT | 准备时间（分钟） |
| cook_time | INT | 烹饪时间（分钟） |
| servings | TINYINT | 份数 |
| calories | INT | 每份卡路里 |
| tips | TEXT | 小贴士 |
| video_url | VARCHAR(500) | 视频教程 |
| view_count | INT UNSIGNED | 浏览次数（索引） |
| favorite_count | INT UNSIGNED | 收藏次数（索引） |

### ingredients（食材表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT UNSIGNED PK | |
| name | VARCHAR(50) UNIQUE | 食材名 |
| category | VARCHAR(30) | 肉类/蔬菜/海鲜/调料/主食/豆制品/蛋奶/菌菇/干货 |
| unit | VARCHAR(10) | 默认单位 |

### recipe_ingredients（菜谱-食材关联，约10万行）

| 字段 | 说明 |
|------|------|
| recipe_id / ingredient_id | 联合索引 |
| amount | 用量（如"300克"、"适量"） |
| unit | 单位 |
| is_main | 是否主料 |

### recipe_steps（制作步骤，约6.6万行）

| 字段 | 说明 |
|------|------|
| recipe_id + step_number | 联合索引 |
| description | 步骤文字 |
| image_url | 步骤图 |
| duration | 该步骤耗时（分钟） |

### categories（分类，支持多级）

| 字段 | 说明 |
|------|------|
| name | 分类名 |
| parent_id | 父分类（NULL 为顶级，自关联实现多级） |
| type | ENUM: cuisine / taste / method / meal / ingredient |
| icon | 图标 emoji 或 URL |
| sort_order | 排序权重 |

### tags / recipe_tags（标签）

标签类型：scene（场景）/ crowd（人群）/ season（季节）/ general（通用），与菜谱多对多。

### users（用户）

| 字段 | 说明 |
|------|------|
| openid | 微信 openid，UNIQUE |
| unionid | 微信 unionid |
| nickname / avatar / phone | 资料 |
| preferences | JSON，用户偏好 |
| status | 1 正常 / 0 禁用 |

### favorites（收藏）

`(user_id, recipe_id)` 唯一索引防止重复收藏。

### browse_history（浏览历史）

`(user_id, recipe_id)` 唯一索引（同一菜谱只保留最新一条，upsert 更新 viewed_at）。
`(user_id, viewed_at)` 索引支持按时间倒序分页。

### nutritional_info（营养成分，与菜谱一对一）

protein / fat / carbs / fiber（克），sodium（毫克），calories（千卡），均为每份数值。

## 索引策略

- 列表筛选字段（cuisine_type、taste、cooking_method、difficulty）单列索引
- 排序字段（view_count、favorite_count）单列索引
- 搜索使用 `LIKE %kw%`，万级数据量下毫秒级；数据量增长后建议接入 MySQL FULLTEXT 或 Elasticsearch

## 数据生成

`server/scripts/generate-recipes.js` 使用可复现伪随机种子，基于真实中餐规律组合生成：
- 70+ 主料 × 12 种烹饪方式 × 9 大菜系 × 10 种口味
- 每道菜 6-7 步骤、6-10 种食材、完整营养估算
- 菜名全局唯一

```bash
node scripts/generate-recipes.js 10000   # 幂等：已有数据达标时跳过
```
