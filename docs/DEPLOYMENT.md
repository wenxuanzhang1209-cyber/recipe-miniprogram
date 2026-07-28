# 部署指南

## 一、前置条件

上线微信小程序必须具备（均需自行办理）：
1. **微信小程序账号**：在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册，获取 AppID 和 AppSecret
2. **服务器**：任意云服务器（推荐 2C4G 起步），安装 Docker
3. **已备案域名**：小程序要求 request 合法域名必须是 **HTTPS + ICP 备案** 域名
4. **SSL 证书**：可在云厂商免费申请

## 二、服务器部署（Docker Compose）

```bash
# 1. 上传项目到服务器
scp -r recipe-miniprogram user@server:/opt/

# 2. 配置生产环境变量
cd /opt/recipe-miniprogram
cat > .env <<'EOF'
JWT_SECRET=<生成一个强随机串>
WX_APPID=<你的小程序AppID>
WX_SECRET=<你的小程序AppSecret>
EOF

# 3. 启动（MySQL + Redis + API 服务）
docker compose up -d

# 4. 灌入 10000 道菜谱数据
docker compose exec server node scripts/generate-recipes.js 10000

# 5. 验证
curl http://localhost:3000/health
```

> 生产安全提示：修改 docker-compose.yml 中的 MySQL root 密码；不要将 3306/6379 端口暴露公网（删除对应 ports 映射）。

## 三、Nginx 反向代理 + HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

## 四、微信小程序后台配置

1. 登录 [小程序管理后台](https://mp.weixin.qq.com) → 开发 → 开发管理 → 开发设置
2. **服务器域名** → request 合法域名添加：`https://api.yourdomain.com`
3. 如使用图床/CDN，将其域名加入 downloadFile 合法域名

## 五、小程序发布

1. 修改 `client/app.js`：`baseUrl: 'https://api.yourdomain.com/api/v1'`
2. 修改 `client/project.config.json`：`appid` 替换为你的 AppID
3. 微信开发者工具 → 上传代码 → 填写版本号
4. 管理后台 → 版本管理 → 提交审核 → 审核通过后发布

> 审核提示：菜谱内容属于「餐饮-菜谱」类目，需在小程序后台补充对应服务类目。

## 六、图片资源说明

当前封面/步骤图使用 picsum.photos 占位图。上线前建议：
1. 准备真实菜品图片上传至 OSS/COS
2. 批量更新 `recipes.cover_image` 与 `recipe_steps.image_url` 字段
3. 将 OSS 域名加入小程序 downloadFile 合法域名

## 七、监控与维护

| 项目 | 方案 |
|------|------|
| 进程守护 | Docker `restart: unless-stopped` 已配置 |
| 健康检查 | `GET /health`，可接入云监控拨测告警 |
| 日志 | `docker compose logs -f server`；生产建议挂载日志目录 + logrotate |
| 数据备份 | 每日 `mysqldump` 定时任务备份 recipe_db |
| 性能 | 热点接口已有 Redis 缓存；QPS 增长后可横向扩容 server 副本 + Nginx 负载均衡 |
| 安全 | 已启用 helmet、限流；定期更新依赖 `npm audit` |

### 数据备份示例（crontab）

```bash
0 3 * * * docker exec recipe-mysql mysqldump -uroot -p<密码> recipe_db | gzip > /backup/recipe_$(date +\%F).sql.gz
```

## 八、版本升级流程

```bash
cd /opt/recipe-miniprogram
git pull                     # 或重新上传代码
docker compose build server
docker compose up -d server  # 滚动重启 API，MySQL/Redis 不受影响
```
