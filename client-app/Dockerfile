# 生产测试镜像：构建 client-app 静态产物（含 games-assets），交给 nginx 托管
# 构建上下文为仓库根目录（需要访问根级 games-assets/ 与 packages/shared）

FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY . .
# 只用国内源；只装 client-app 及其依赖（避免装 admin-panel/echarts）
RUN npm config set registry https://registry.npmmirror.com \
  && pnpm config set registry https://registry.npmmirror.com \
  && pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-mintimeout 20000 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm install --frozen-lockfile --filter @gamebox/client-app...
# 恢复类型检查，再出静态产物
RUN pnpm --filter @gamebox/shared build \
  && pnpm --filter @gamebox/client-app exec vue-tsc -b \
  && pnpm --filter @gamebox/client-app exec vite build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /repo/client-app/dist /usr/share/nginx/html
COPY client-app/deploy/nginx.conf /etc/nginx/conf.d/default.conf
# 可选 TLS：挂载证书到 /etc/nginx/certs 并设置 ENABLE_TLS=1 使用 nginx.tls.conf
COPY client-app/deploy/nginx.tls.conf /etc/nginx/templates/default.tls.conf
EXPOSE 80 443
