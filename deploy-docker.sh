#!/usr/bin/env bash
#
# JobGuard 一键部署脚本 — Docker 版
# 用法: bash deploy-docker.sh [--no-db] [--build-only]
#
set -euo pipefail

cd "$(dirname "$0")"

# ── 颜色 ─────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 参数 ─────────────────────────────────────────────────────────────────────
NO_DB=false
BUILD_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --no-db)      NO_DB=true ;;
    --build-only) BUILD_ONLY=true ;;
  esac
done

# ── 前置检查 ──────────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "未检测到 docker，请先安装"
docker info >/dev/null 2>&1    || error "Docker 守护进程未运行"

# ── .env ─────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    warn "已创建 .env，请填入配置后重新运行"; exit 1
  else
    error "缺少 .env 文件"
  fi
fi

# 读取 .env 中的变量
set -a; source .env 2>/dev/null || true; set +a
PORT="${PORT:-3000}"
info "端口: ${PORT}"

# ── 构建 ─────────────────────────────────────────────────────────────────────
info "构建 Docker 镜像..."
docker build \
  --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-JobGuard}" \
  --build-arg NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:${PORT}}" \
  -t jobguard:latest .

[ "$BUILD_ONLY" = true ] && { info "构建完成"; exit 0; }

# ── 启动 ─────────────────────────────────────────────────────────────────────
docker rm -f jobguard 2>/dev/null || true

info "启动 JobGuard..."
docker run -d \
  --name jobguard \
  --restart unless-stopped \
  --env-file .env \
  -e NODE_ENV=production \
  -e PORT="${PORT}" \
  -e HOSTNAME=0.0.0.0 \
  -p "${PORT}:${PORT}" \
  jobguard:latest

# ── 健康检查 ──────────────────────────────────────────────────────────────────
info "等待启动..."
sleep 3
for _ in $(seq 1 15); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    echo ""
    info "============================================"
    info "  JobGuard 部署成功!"
    info "  访问: http://localhost:${PORT}"
    info "============================================"
    exit 0
  fi
  printf "."
  sleep 2
done

echo ""
warn "服务可能还在启动中"
warn "查看日志: docker logs -f jobguard"
