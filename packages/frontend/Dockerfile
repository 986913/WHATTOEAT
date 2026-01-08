#创建一个生产用 Dockerfile（先 build 前端，再用 nginx 提供静态）

FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8000
CMD ["nginx", "-g", "daemon off;"]