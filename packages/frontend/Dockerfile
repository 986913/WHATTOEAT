#创建一个生产用 Dockerfile（先 build 前端，再用 nginx 提供静态）

FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# 确保 package.json 有 build 脚本，下面会执行它
RUN npm run build