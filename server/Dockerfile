FROM node:20-alpine

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存
COPY package*.json ./
RUN npm install --omit=dev --registry=https://registry.npmmirror.com \
    && npm cache clean --force

COPY . .

# 安全：以非 root 用户运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/data /app/uploads \
    && chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

# 健康检查（容器编排/重启策略依赖）
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]
FROM node:20-alpine

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存
COPY package*.json ./
RUN npm install --omit=dev --registry=https://registry.npmmirror.com

COPY . .

EXPOSE 3000

CMD ["node", "src/app.js"]
