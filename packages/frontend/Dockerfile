# Frontend Dockerfile - 多阶段构建
# 阶段 1 (builder)：Node 环境下 build React 项目，产出静态文件
# 阶段 2 (nginx)：只拷贝静态文件到 nginx 镜像，最终镜像不包含 Node.js，体积更小

# ─── 阶段 1：构建 ───
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# 产出 build/ 目录（React 静态文件）
RUN npm run build

# ─── 阶段 2：运行 ───
FROM nginx:alpine
# 从 builder 阶段拷贝构建产物
COPY --from=builder /app/build /usr/share/nginx/html
# 自定义 nginx 配置（SPA 路由 + API 反向代理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 对外暴露 8000，与 nginx.conf 中 listen 8000 对应
EXPOSE 8000
