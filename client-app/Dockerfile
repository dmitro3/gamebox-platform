# 生产测试镜像：构建 client-app 静态产物（含 games-assets），交给 nginx 托管
# 构建上下文为仓库根目录（需要访问根级 games-assets/ 与 packages/shared）

FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# 跳过 vue-tsc 类型检查，直接出静态产物，缩短构建时间/降低构建期内存占用
RUN pnpm --filter @gamebox/client-app exec vite build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /repo/client-app/dist /usr/share/nginx/html
COPY client-app/deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
