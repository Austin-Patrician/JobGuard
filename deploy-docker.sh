#!/usr/bin/env bash
#
# JobGuard 一键部署脚本 — Docker 版
# 用法: bash deploy-docker.sh [--build-only] [--no-db] [--domain example.com]
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
DOMAIN="${DOMAIN:-}"
APP_BIND_IP="${APP_BIND_IP:-}"
PUBLIC_URL_SCHEME="${PUBLIC_URL_SCHEME:-}"
PROXY_HTTP_PORT="${PROXY_HTTP_PORT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only)
      BUILD_ONLY=true
      shift
      ;;
    --no-db)
      NO_DB=true
      shift
      ;;
    --domain)
      [ $# -ge 2 ] || error "--domain 需要提供域名"
      DOMAIN="$2"
      shift 2
      ;;
    *)
      shift
      ;;
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

if [ -z "${PORT:-}" ]; then
  PORT=$(echo "${NEXT_PUBLIC_APP_URL:-}" | grep -oP ':\K[0-9]+$' || echo "3000")
fi
PORT="${PORT:-3000}"
PUBLIC_URL_SCHEME="${PUBLIC_URL_SCHEME:-https}"
info "应用端口: $PORT"

if [ -n "$DOMAIN" ]; then
  NEXT_PUBLIC_APP_URL="${PUBLIC_URL_SCHEME}://${DOMAIN}"
  APP_BIND_IP="${APP_BIND_IP:-127.0.0.1}"
  PROXY_HTTP_PORT="${PROXY_HTTP_PORT:-80}"
  info "启用域名反向代理: ${DOMAIN}"
  info "外部访问地址将使用: ${NEXT_PUBLIC_APP_URL}"
else
  APP_BIND_IP="${APP_BIND_IP:-0.0.0.0}"
fi

if command -v docker compose >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  error "未检测到 docker compose，请升级 Docker 或安装 docker-compose"
fi

prepare_proxy_config() {
  local template_path="deploy/nginx/default.conf.template"
  local output_path=".deploy/nginx/default.conf"
  local server_names="$DOMAIN"

  if [ -n "${DOMAIN_ALIASES:-}" ]; then
    server_names="${server_names} ${DOMAIN_ALIASES}"
  fi

  mkdir -p .deploy/nginx
  sed \
    -e "s|__SERVER_NAMES__|${server_names}|g" \
    -e "s|__APP_PORT__|${PORT}|g" \
    "$template_path" > "$output_path"
}

cleanup_legacy_container() {
  local name="$1"
  if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
    info "移除旧容器: $name"
    docker rm -f "$name" >/dev/null 2>&1 || true
  fi
}

SERVICES=("jobguard")
if [ "$NO_DB" = false ]; then
  SERVICES=("postgres" "jobguard")
fi
if [ -n "$DOMAIN" ]; then
  SERVICES+=("nginx")
fi

if [ -n "$DOMAIN" ]; then
  prepare_proxy_config
fi

cleanup_legacy_container "jobguard"
cleanup_legacy_container "jobguard-proxy"
if [ "$NO_DB" = false ]; then
  cleanup_legacy_container "jobguard-db"
fi

export PORT
export APP_BIND_IP
export PROXY_HTTP_PORT="${PROXY_HTTP_PORT:-80}"
export NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-JobGuard}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:${PORT}}"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"

info "正在构建 Docker 镜像..."
$DC build jobguard

if [ "$BUILD_ONLY" = true ]; then
  info "构建完成（仅构建模式，未启动服务）"
  exit 0
fi

info "启动服务: ${SERVICES[*]}"
$DC up -d "${SERVICES[@]}"

if [ "$NO_DB" = true ]; then
  $DC stop postgres >/dev/null 2>&1 || true
fi
if [ -z "$DOMAIN" ]; then
  $DC stop nginx >/dev/null 2>&1 || true
fi

# ── 等待启动 ──────────────────────────────────────────────────────────────────
info "等待服务启动..."
sleep 3

HEALTHCHECK_URL="http://localhost:${PORT}/api/health"
DISPLAY_URL="http://localhost:${PORT}"
if [ -n "$DOMAIN" ]; then
  HEALTHCHECK_URL="http://localhost:${PROXY_HTTP_PORT}/api/health"
  DISPLAY_URL="${NEXT_PUBLIC_APP_URL}"
fi

for i in $(seq 1 15); do
  if curl -sf "$HEALTHCHECK_URL" >/dev/null 2>&1; then
    echo ""
    info "============================================"
    info "  JobGuard 部署成功!"
    info "  访问地址: ${DISPLAY_URL}"
    if [ -n "$DOMAIN" ]; then
      info "  源站入口: http://${DOMAIN}:${PROXY_HTTP_PORT}"
      warn "Cloudflare 橙色云模式下，请使用 80/443，不要继续访问 :${PORT}"
      warn "若源站未配置证书，请在 Cloudflare SSL/TLS 中使用 Flexible"
    fi
    info "============================================"
    exit 0
  fi
  printf "."
  sleep 2
done

echo ""
warn "服务可能还在启动中，请稍后访问 ${DISPLAY_URL}"
warn "查看日志: $DC logs -f ${SERVICES[*]}"
