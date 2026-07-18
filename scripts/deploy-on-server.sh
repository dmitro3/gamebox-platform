#!/bin/bash
# 在服务器上执行（文件已上传到 /tmp 后）
# 用法：bash /tmp/deploy-on-server.sh
# 幂等：重复部署复用已有 DB/JWT 密钥，生产只 migrate 不 seed
set -euo pipefail

DEPLOY_DIR=/opt/gamebox-platform
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-}"
mkdir -p "$DEPLOY_DIR/server"
cd "$DEPLOY_DIR"

if [ ! -f /tmp/gamebox-images.tar.gz ]; then
  echo "缺少 /tmp/gamebox-images.tar.gz，请先从本机 scp 上传"
  exit 1
fi
if [ ! -f /tmp/docker-compose.prod.images.yml ]; then
  echo "缺少 /tmp/docker-compose.prod.images.yml，请先从本机 scp 上传"
  exit 1
fi

mv -f /tmp/gamebox-images.tar.gz "$DEPLOY_DIR/"
mv -f /tmp/docker-compose.prod.images.yml "$DEPLOY_DIR/"

echo "==> 导入镜像..."
docker load -i gamebox-images.tar.gz

echo "==> 拉取 postgres/redis（若本地已有会很快）..."
docker pull postgres:15-alpine || true
docker pull redis:7-alpine || true

# 密钥：首次生成并持久化，重复部署复用
if [ -f .env.prod ] && grep -q '^DB_PASSWORD=' .env.prod; then
  # shellcheck disable=SC1091
  set -a
  # shellcheck disable=SC1091
  source .env.prod
  set +a
  echo "==> 复用已有 .env.prod 密钥"
else
  DB_PASSWORD=$(openssl rand -hex 16)
  JWT_SECRET=$(openssl rand -hex 32)
  REDIS_PASSWORD=$(openssl rand -hex 16)
  echo "DB_PASSWORD=$DB_PASSWORD" > .env.prod
  echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env.prod
  echo "JWT_SECRET=$JWT_SECRET" >> .env.prod
  echo "==> 已生成并写入 .env.prod（请妥善备份）"
fi

: "${DB_PASSWORD:?DB_PASSWORD 缺失}"
: "${JWT_SECRET:?JWT_SECRET 缺失}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

if [ -z "$PUBLIC_BASE_URL" ]; then
  # 未指定时用本机公网 IP 猜测，仍可通过环境变量覆盖
  HOST_IP=$(curl -s --max-time 3 ifconfig.me || hostname -I | awk '{print $1}')
  PUBLIC_BASE_URL="http://${HOST_IP}:8080"
fi

REDIS_URL="redis://redis:6379"
if [ -n "$REDIS_PASSWORD" ]; then
  REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"
fi

cat > server/.env.production <<EOF
NODE_ENV=production
PORT=3001
PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
DATABASE_URL=postgresql://gamebox:${DB_PASSWORD}@postgres:5432/gamebox?schema=public
REDIS_URL=${REDIS_URL}
JWT_SECRET=${JWT_SECRET}
PLATFORM_FEE_RATE=0.05
DEFAULT_BALANCE=0
COMMISSION_MAX_LEVEL=5
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./public/uploads
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=120
EOF

echo "==> 启动容器..."
docker compose -f docker-compose.prod.images.yml --env-file .env.prod up -d

echo "==> 等待服务健康..."
ATTEMPTS=60
for i in $(seq 1 "$ATTEMPTS"); do
  if docker compose -f docker-compose.prod.images.yml --env-file .env.prod exec -T server \
    wget -qO- http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
    echo "健康检查通过（第 ${i} 次）"
    break
  fi
  if [ "$i" -eq "$ATTEMPTS" ]; then
    echo "健康检查超时，请查看 docker compose logs server"
    docker compose -f docker-compose.prod.images.yml --env-file .env.prod ps
    exit 1
  fi
  sleep 2
done

echo "==> 数据库迁移（生产不执行 seed）..."
docker compose -f docker-compose.prod.images.yml --env-file .env.prod exec -T server \
  npx prisma migrate deploy

echo "==> 状态："
docker compose -f docker-compose.prod.images.yml --env-file .env.prod ps

echo ""
echo "完成。访问：${PUBLIC_BASE_URL}"
echo "（生产环境不自动 seed；测试账号请自行创建）"
