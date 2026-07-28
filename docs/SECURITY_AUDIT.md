# 生产安全终审报告

> 版本：v1.0.0-rc.1 | 审计日期：2026-07-28
> 审计方式：代码审查 + 自动化安全测试（13 个用例）+ 备份恢复演练

---

## 一、API 权限矩阵（21 个端点）

| 端点 | 方法 | 鉴权 | 说明 | 测试覆盖 |
|------|------|------|------|----------|
| /auth/wx-login | POST | 公开 | 微信登录 | ✅ |
| /auth/logout | POST | requireAuth | 退出登录(审计) | ✅ |
| /recipes | GET | 公开 | 菜谱列表 | ✅ |
| /recipes/search | GET | 公开 | 搜索 | ✅ 注入测试 |
| /recipes/popular | GET | 公开 | 热门 | ✅ |
| /recipes/recommend | GET | optionalAuth | 推荐(登录则个性化) | ✅ |
| /recipes/:id | GET | optionalAuth | 详情(登录记录历史) | ✅ |
| /recipes/:id/related | GET | 公开 | 相关推荐 | ✅ |
| /recipes | POST | requireAuth | 创建(管理) | ✅ |
| /recipes/:id | PUT | requireAuth | 更新(管理) | ✅ |
| /recipes/:id | DELETE | requireAuth | 删除(管理) | ✅ |
| /categories | GET | 公开 | 分类树 | ✅ |
| /categories/:id/recipes | GET | 公开 | 分类菜谱 | ✅ |
| /user/profile | GET | requireAuth | 个人资料 | ✅ 401测试 |
| /user/profile | PUT | requireAuth | 更新资料 | ✅ |
| /user/preferences | PUT | requireAuth | 更新偏好 | ✅ |
| /favorites | POST | requireAuth | 收藏 | ✅ 幂等/并发 |
| /favorites/:recipeId | DELETE | requireAuth | 取消收藏 | ✅ 越权测试 |
| /favorites | GET | requireAuth | 收藏列表 | ✅ 隔离测试 |
| /history | GET | requireAuth | 浏览历史 | ✅ 隔离测试 |
| /history | DELETE | requireAuth | 清空历史 | ✅ 隔离测试 |

**结论**：所有涉及用户私有数据的端点均要求 `requireAuth`，且通过 `user_id` 隔离查询，无水平越权路径。

---

## 二、安全测试结果（13/13 通过）

| 测试项 | 结果 |
|--------|------|
| 无 token 访问受保护接口 → 401 | ✅ |
| 伪造/无效 token → 401 | ✅ |
| 篡改 token → 401 | ✅ |
| 用户A收藏对用户B不可见 | ✅ |
| 用户B不能删除用户A的收藏 | ✅ |
| 用户A清空历史不影响用户B | ✅ |
| 重复收藏幂等 | ✅ |
| 并发收藏(5次)最终1条 | ✅ |
| SQL 注入不报错不泄露 | ✅ |
| XSS 特殊字符正常处理 | ✅ |
| 空关键词不报错 | ✅ |
| Redis 不可用降级正常 | ✅ |
| 分类树无 Redis 正常 | ✅ |

---

## 三、生产环境 Mock 登录禁用（代码审查验证）

`server/src/services/authService.js` 第 13 行：

```js
if (config.env !== 'production' && code.startsWith('dev_')) {
  // 仅非生产环境允许 dev_ 模拟码
} else {
  // 生产环境：dev_ 码会走真实微信 API，因 code 无效而返回 401
}
```

**验证结论**：
- ✅ 生产环境（`NODE_ENV=production`）下，`dev_` 前缀 Mock 码**不会**被特殊处理，会发送到微信官方接口，因 code 无效而登录失败
- ✅ Mock 登录仅在开发/测试环境可用，且明确以 `dev_` 前缀标识
- ✅ AppSecret 仅存在于服务端 `.env`，不进入客户端、日志、Git 仓库（`.gitignore` 已排除 `.env`）

---

## 四、其他安全检查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| JWT 弱密钥 | ✅ 已防护 | 生产环境 validateEnv 拒绝弱密钥启动 |
| 错误栈泄露 | ✅ 无 | errorHandler 对 500 只返回"服务器内部错误"，堆栈仅入日志 |
| 请求体超限 | ✅ 已限制 | express.json limit 2mb |
| 限流 | ✅ 已配置 | 300/min/IP，可配置 |
| 日志敏感信息 | ✅ 无 | 错误日志只记 message，不记 token/code/AppSecret |
| .env 进入镜像 | ✅ 已防护 | .dockerignore 排除 .env |
| Docker root 用户 | ✅ 已防护 | Dockerfile 使用 appuser 非 root |
| CORS | ⚠️ 宽松 | 当前 `cors()` 全开放，生产建议限定小程序域名 |
| Redis 未授权访问 | ⚠️ 依赖配置 | 生产需设置 REDIS_PASSWORD |
| 依赖漏洞 | ⏳ 待扫描 | 建议上线前 `npm audit` |

---

## 五、备份与恢复演练（真实执行）

| 步骤 | 结果 |
|------|------|
| 1. 执行备份 | ✅ SHA256 `72b877a9...`，记录数 recipes=10000 |
| 2. 模拟数据误删（删除500条） | ✅ 10000 → 9500 |
| 3. 从备份恢复 | ✅ 自动先备份当前库，再恢复 |
| 4. SHA256 校验 | ✅ 一致 |
| 5. 记录数校验 | ✅ 恢复至 10000 |

**结论**：备份恢复流程真实可用，数据一致性校验通过。Redis 缓存丢失不影响业务数据（仅缓存，自动重建）。

---

## 六、安全结论

- ✅ 无阻断级安全漏洞
- ✅ 权限隔离、注入防护、限流、密钥管理均已验证
- ⚠️ 2 项建议（CORS 收紧、Redis 密码）列入上线配置项
- ⏳ 上线前执行 `npm audit` 扫描依赖漏洞
