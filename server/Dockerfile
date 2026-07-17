# 生产测试镜像：多阶段构建 NestJS 服务
# 构建上下文为仓库根目录（需要访问 packages/shared 与根 lockfile）

FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @gamebox/shared build
RUN pnpm --filter @gamebox/server exec prisma generate
RUN pnpm --filter @gamebox/server build

FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /repo

# 只拷运行所需内容，不带 client-app/admin-panel/games-assets/docs 等
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/server ./server

WORKDIR /repo/server
EXPOSE 3001
CMD ["node", "dist/main.js"]
