# Backend Dockerfile - NestJS API 服务
# 构建流程：安装依赖 → TypeScript 编译 → 运行编译后的 JS

FROM node:20-bullseye
WORKDIR /app

# 先拷贝 package 文件，利用 Docker 缓存层：依赖没变时跳过 npm ci
COPY package*.json ./
# ci 比 install 更快更严格，完全按照 lock 文件安装
RUN npm ci

# 拷贝源码并编译 TypeScript → dist/
COPY . .
RUN npm run build

# 声明容器监听 3001，ALB 通过 target group 将流量转发到此端口
EXPOSE 3001
# 运行编译后的 NestJS 入口文件
CMD ["node", "dist/src/main"]
