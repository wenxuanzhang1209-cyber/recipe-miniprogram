# RESUME — 长任务恢复指南

## 当前状态
- **Batch 1 已完成**，测试 41/41 通过
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

## Batch 2 待办（下一批）
1. 业务链路审计：逐项核验19个API前后端一致性
2. 推荐系统改造：偏好影响推荐+推荐理由+忌口/过敏原过滤
3. 搜索增强：输入防抖、无结果建议、取消过期请求
4. 菜谱详情增强：人数换算、过敏原提示、做菜模式

## 当前阻塞
- 无代码阻塞
- 上线阻塞项见 progress.json launchBlockers

## 关键架构决策
- 偏好数据结构: `{cuisines[], avoidIngredients[], spiceLevel, dietGoal, dietType, allergens[], difficulties[], maxCookTime, equipment[], servings}`
- 设计Token: 全部CSS变量定义在 styles/tokens.wxss，页面样式只引用变量
- 图标: 纯Node.js程序化生成(PNG编码器在generate-icons.js中)，可重复生成
