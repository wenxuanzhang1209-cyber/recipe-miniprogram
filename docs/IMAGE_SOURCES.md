# 菜谱图片资源清单与策略

## 当前策略（开发/演示阶段）

由于无法合法获取 10,000 张与菜名一一对应的真实菜品照片，当前采用**菜系确定性本地占位图**：

| 资源 | 路径 | 说明 | 许可 |
|------|------|------|------|
| 川菜占位图 | `client/images/recipes/chuancai.png` | 程序化生成，红色渐变+碗形图标 | 项目自有（脚本生成） |
| 粤菜占位图 | `client/images/recipes/yuecai.png` | 同上，金色 | 项目自有 |
| 鲁菜占位图 | `client/images/recipes/lucai.png` | 同上，棕色 | 项目自有 |
| 苏菜占位图 | `client/images/recipes/sucai.png` | 同上，青绿 | 项目自有 |
| 浙菜占位图 | `client/images/recipes/zhecai.png` | 同上，绿色 | 项目自有 |
| 闽菜占位图 | `client/images/recipes/mincai.png` | 同上，橙色 | 项目自有 |
| 湘菜占位图 | `client/images/recipes/xiangcai.png` | 同上，深红 | 项目自有 |
| 徽菜占位图 | `client/images/recipes/huicai.png` | 同上，紫色 | 项目自有 |
| 家常菜占位图 | `client/images/recipes/jiachang.png` | 同上，暖橙 | 项目自有 |
| 东北菜占位图 | `client/images/recipes/dongbei.png` | 同上，靛蓝 | 项目自有 |
| 西北菜占位图 | `client/images/recipes/xibei.png` | 同上，金黄 | 项目自有 |
| 云贵菜占位图 | `client/images/recipes/yungui.png` | 同上，青绿 | 项目自有 |
| 默认/兜底图 | `client/images/recipes/default.png`、`fallback.png` | 灰色，加载失败降级用 | 项目自有 |

所有图片由 `client/scripts/generate-recipe-images.js`（绘图库 `client/scripts/lib/pnglib.js`）程序化生成，**无外部版权依赖**，可重复生成。

### 数据库映射
- `recipes.cover_image` 已按 `cuisine_type` 统一更新为本地路径（如 `/images/recipes/chuancai.png`）
- 变更记录：`server/data/image-change-log.json`
- 修改前备份：`server/data/recipe.sqlite.bak-*`

### 已解决的问题
- ✅ 不再使用 picsum.photos 随机图（每次加载变化、与菜名无关、依赖外网）
- ✅ 图片确定性（同菜系固定，不随机变化）
- ✅ 本地资源（无网络依赖，不会加载失败）
- ✅ 前端兜底（`recipe-card` 组件 `binderror` → `fallback.png`）

## ⚠️ 上线前必须替换为真实菜品照片

当前占位图**不是真实菜品照片**，与具体菜名不匹配。上线前需：

1. **图片来源要求**（必须合法）：
   - 自行拍摄（推荐，至少覆盖热门 500 道菜）
   - 采购正版图库（如视觉中国、Shutterstock 商用授权）
   - 使用 CC0/CC-BY 许可的公共图片（如 Unsplash、Pexels，需保留署名 attribution）
   - **禁止**：抓取搜索引擎图片、使用来源不明素材

2. **建立对应清单**：为每张图片记录 `菜谱ID → 图片文件 → 来源 → 许可证`，补充到本文件。

3. **技术要求**：
   - 压缩至 < 200KB/张，建议 WebP 格式
   - 统一比例 4:3，上传 OSS/COS 并接入 CDN
   - 更新 `cover_image` 为 CDN URL

4. **图片清单模板**（替换时填写）：

| 菜谱ID | 菜名 | 图片文件/URL | 来源 | 许可证 | 拍摄/授权日期 |
|--------|------|--------------|------|--------|---------------|
| 1 | 示例红烧肉 | https://cdn.example.com/1.webp | 自行拍摄 | 项目自有 | 2026-XX-XX |

## 重新生成占位图

```bash
cd server && DB_DIALECT=sqlite node scripts/generate-recipe-images.js
```
