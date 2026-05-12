# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制前端代码
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 后端阶段
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY server/package*.json ./
RUN npm ci --omit=dev

# 复制后端代码
COPY server/index.js ./

# 复制构建好的前端静态文件
COPY --from=builder /app/dist ./public

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["node", "index.js"]
