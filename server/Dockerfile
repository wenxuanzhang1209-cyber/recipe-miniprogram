FROM node:20-alpine

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存
COPY package*.json ./
RUN npm install --omit=dev --registry=https://registry.npmmirror.com

COPY . .

EXPOSE 3000

CMD ["node", "src/app.js"]
