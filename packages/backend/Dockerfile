FROM node:20-bullseye
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# 确保 package.json 有 build 脚本，下面会执行它
RUN npm run build

EXPOSE 3001
# Docker 会用 Node.js 运行 dist/src/main 文件
CMD ["node", "dist/src/main"]