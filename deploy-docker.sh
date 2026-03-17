#!/usr/bin/env bash
#
# JobGuard 一键部署脚本 — Docker 版
# 用法: bash deploy-docker.sh [--build-only] [--no-db]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── 颜色 ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 参数解析 ──────────────────────────────────────────────────────────────────
BUILD_ONLY=false
NO_DB=false
for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=true ;;
    --no-db)      NO_DB=true ;;
  esac
done

# ── 前置检查 ──────────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "未检测到 docker，请先安装 Docker: https://docs.docker.com/get-docker/"

if ! docker info >/dev/null 2>&1; then
  error "Docker 守护进程未运行，请先启动 Docker"
fi

# ── .env 检查 ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  warn ".env 文件不存在，正在从 .env.example 复制..."
  if [ -f .env.example ]; then
    cp .env.example .env
    warn "请编辑 .env 文件填入真实配置后重新运行本脚本"
    exit 1
  else
    error "未找到 .env.example，请手动创建 .env 文件"
  fi
fi

# 检查关键变量
source_env() {
  set -a
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  set +a
}
source_env

if [ "${OPENAI_API_KEY:-}" = "your-openai-key" ] || [ -z "${OPENAI_API_KEY:-}" ]; then
  warn "OPENAI_API_KEY 未配置，AI 功能将不可用"
fi

# ── 构建 & 启动 ──────────────────────────────────────────────────────────────
if command -v docker compose >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  error "未检测到 docker compose，请升级 Docker 或安装 docker-compose"
fi

info "正在构建 Docker 镜像..."

if [ "$NO_DB" = true ]; then
  # 绕过 docker-compose，避免解析 postgres 服务并拉取镜像
  docker build -t jobguard:latest .
  if [ "$BUILD_ONLY" = false ]; then
    info "启动 JobGuard（不含数据库）..."
    # 停掉旧容器（如果存在）
    docker rm -f jobguard 2>/dev/null || true
    docker run -d \
      --name jobguard \
      --restart unless-stopped \
      --env-file .env \
      -e NODE_ENV=production \
      -p "${PORT:-3000}:3000" \
      jobguard:latest
  fi
else
  $DC build
  if [ "$BUILD_ONLY" = false ]; then
    info "启动 JobGuard + PostgreSQL..."
    $DC up -d
  fi
fi

if [ "$BUILD_ONLY" = true ]; then
  info "构建完成（仅构建模式，未启动服务）"
  exit 0
fi

# ── 等待启动 ──────────────────────────────────────────────────────────────────
info "等待服务启动..."
sleep 3

PORT="${PORT:-3000}"
for i in $(seq 1 15); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    echo ""
    info "============================================"
    info "  JobGuard 部署成功!"
    info "  访问地址: http://localhost:${PORT}"
    info "============================================"
    exit 0
  fi
  printf "."
  sleep 2
done

echo ""
warn "服务可能还在启动中，请稍后访问 http://localhost:${PORT}"
if [ "$NO_DB" = true ]; then
  warn "查看日志: docker logs -f jobguard"
else
  warn "查看日志: $DC logs -f jobguard"
fi
