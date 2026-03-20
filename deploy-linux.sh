#!/usr/bin/env bash
#
# JobGuard 一键部署脚本 — Linux + Nginx + systemd
# 用法:
#   bash deploy-linux.sh
#   bash deploy-linux.sh --domain jobguard.example.com --email ops@example.com
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="${SCRIPT_DIR}/deploy"
SERVICE_NAME="jobguard"
DEFAULT_PORT=3000

cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

usage() {
  cat <<'EOF'
用法:
  bash deploy-linux.sh [选项]

选项:
  --domain DOMAIN      设置站点域名，例如 jobguard.example.com
  --email EMAIL        设置 Let's Encrypt 邮箱
  --port PORT          设置本机应用监听端口，默认 3000
  --skip-deps          跳过系统依赖安装检查
  --skip-https         跳过 Certbot 证书签发，仅部署 HTTP
  --help               显示帮助
EOF
}

APP_DOMAIN=""
LETSENCRYPT_EMAIL=""
PORT="$DEFAULT_PORT"
CLI_APP_DOMAIN=""
CLI_LETSENCRYPT_EMAIL=""
CLI_PORT=""
DOMAIN_FROM_CLI=false
EMAIL_FROM_CLI=false
PORT_FROM_CLI=false
SKIP_DEPS=false
SKIP_HTTPS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      CLI_APP_DOMAIN="${2:-}"
      DOMAIN_FROM_CLI=true
      shift 2
      ;;
    --email)
      CLI_LETSENCRYPT_EMAIL="${2:-}"
      EMAIL_FROM_CLI=true
      shift 2
      ;;
    --port)
      CLI_PORT="${2:-}"
      PORT_FROM_CLI=true
      shift 2
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --skip-https)
      SKIP_HTTPS=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      error "未知参数: $1"
      ;;
  esac
done

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[&|]/\\&/g'
}

extract_host_from_url() {
  local url="$1"
  url="${url#http://}"
  url="${url#https://}"
  url="${url%%/*}"
  printf '%s' "${url%%:*}"
}

retry_http_check() {
  local url="$1"
  local attempts="${2:-20}"
  local sleep_seconds="${3:-2}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  return 1
}

render_template() {
  local template="$1"
  local output="$2"

  sed \
    -e "s|__APP_DOMAIN__|$(escape_sed_replacement "$APP_DOMAIN")|g" \
    -e "s|__APP_PORT__|$(escape_sed_replacement "$PORT")|g" \
    -e "s|__APP_USER__|$(escape_sed_replacement "$RUN_USER")|g" \
    -e "s|__WORKDIR__|$(escape_sed_replacement "$SCRIPT_DIR")|g" \
    -e "s|__ENV_FILE__|$(escape_sed_replacement "${SCRIPT_DIR}/.env")|g" \
    -e "s|__NODE_BIN__|$(escape_sed_replacement "$NODE_BIN")|g" \
    -e "s|__PUBLIC_URL__|$(escape_sed_replacement "$EFFECTIVE_APP_URL")|g" \
    "$template" > "$output"
}

detect_pkg_manager() {
  if command_exists apt-get; then
    echo "apt"
  elif command_exists dnf; then
    echo "dnf"
  elif command_exists yum; then
    echo "yum"
  else
    echo "unknown"
  fi
}

PKG_MANAGER="$(detect_pkg_manager)"

install_packages() {
  if [ "$PKG_MANAGER" = "unknown" ]; then
    error "无法识别系统包管理器，请手动安装缺失依赖"
  fi

  case "$PKG_MANAGER" in
    apt)
      sudo apt-get update
      sudo apt-get install -y "$@"
      ;;
    dnf)
      sudo dnf install -y "$@"
      ;;
    yum)
      sudo yum install -y "$@"
      ;;
  esac
}

install_node() {
  info "安装 Node.js 22..."

  case "$PKG_MANAGER" in
    apt)
      install_packages ca-certificates curl gnupg
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
      install_packages nodejs
      ;;
    dnf)
      install_packages curl ca-certificates
      curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
      install_packages nodejs
      ;;
    yum)
      install_packages curl ca-certificates
      curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
      install_packages nodejs
      ;;
    *)
      error "无法自动安装 Node.js，请手动安装 Node.js >= 20"
      ;;
  esac

  hash -r
}

install_nginx() {
  info "安装 Nginx..."
  install_packages nginx
}

install_certbot() {
  info "安装 Certbot..."
  case "$PKG_MANAGER" in
    apt)
      install_packages certbot python3-certbot-nginx
      ;;
    dnf|yum)
      install_packages certbot python3-certbot-nginx
      ;;
    *)
      error "无法自动安装 Certbot，请手动安装 certbot 与 nginx 插件"
      ;;
  esac
}

setup_env() {
  local env_domain=""
  local env_email=""
  local env_port=""

  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      cp .env.example .env
      warn "已创建 .env，请填入真实配置后重新运行脚本"
      exit 1
    fi
    error "缺少 .env 文件"
  fi

  set -a
  source .env 2>/dev/null || true
  set +a

  env_domain="${APP_DOMAIN:-}"
  env_email="${LETSENCRYPT_EMAIL:-}"
  env_port="${PORT:-}"

  if [ "$DOMAIN_FROM_CLI" = false ]; then
    APP_DOMAIN="$env_domain"
  else
    APP_DOMAIN="$CLI_APP_DOMAIN"
  fi

  if [ "$EMAIL_FROM_CLI" = false ]; then
    LETSENCRYPT_EMAIL="$env_email"
  else
    LETSENCRYPT_EMAIL="$CLI_LETSENCRYPT_EMAIL"
  fi

  if [ "$PORT_FROM_CLI" = false ]; then
    PORT="${env_port:-$DEFAULT_PORT}"
  else
    PORT="$CLI_PORT"
  fi

  if [ -z "$APP_DOMAIN" ] && [ -n "${NEXT_PUBLIC_APP_URL:-}" ]; then
    local inferred_domain
    inferred_domain="$(extract_host_from_url "$NEXT_PUBLIC_APP_URL")"
    if [ "$inferred_domain" != "localhost" ] && [ "$inferred_domain" != "127.0.0.1" ]; then
      APP_DOMAIN="$inferred_domain"
    fi
  fi

  [ -n "$APP_DOMAIN" ] || error "请通过 .env 中的 APP_DOMAIN=... 或 --domain 提供域名"

  if [ -z "${NEXT_PUBLIC_APP_URL:-}" ] || \
     [ "${NEXT_PUBLIC_APP_URL#http://localhost}" != "$NEXT_PUBLIC_APP_URL" ] || \
     [ "${NEXT_PUBLIC_APP_URL#http://127.0.0.1}" != "$NEXT_PUBLIC_APP_URL" ] || \
     [ "${NEXT_PUBLIC_APP_URL#https://localhost}" != "$NEXT_PUBLIC_APP_URL" ] || \
     [ "${NEXT_PUBLIC_APP_URL#https://127.0.0.1}" != "$NEXT_PUBLIC_APP_URL" ]; then
    if [ "$SKIP_HTTPS" = true ]; then
      EFFECTIVE_APP_URL="http://${APP_DOMAIN}"
    else
      EFFECTIVE_APP_URL="https://${APP_DOMAIN}"
    fi
  else
    EFFECTIVE_APP_URL="$NEXT_PUBLIC_APP_URL"
  fi

  if [ "$SKIP_HTTPS" = false ] && [ -z "$LETSENCRYPT_EMAIL" ]; then
    error "缺少 LETSENCRYPT_EMAIL，请在 .env 中设置或通过 --email 传入"
  fi

  if [ ! -f "${TEMPLATE_DIR}/nginx/jobguard.conf.template" ]; then
    error "缺少 Nginx 模板文件"
  fi

  if [ ! -f "${TEMPLATE_DIR}/systemd/jobguard.service.template" ]; then
    error "缺少 systemd 模板文件"
  fi
}

setup_dependencies() {
  if [ "$SKIP_DEPS" = true ]; then
    info "跳过系统依赖安装检查"
    return
  fi

  command_exists curl || install_packages curl

  if ! command_exists node; then
    install_node
  fi

  local node_major
  node_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  if [ "$node_major" -lt 20 ]; then
    install_node
  fi
  info "Node.js $(node -v) ✓"

  command_exists nginx || install_nginx
  info "Nginx $(nginx -v 2>&1) ✓"

  if [ "$SKIP_HTTPS" = false ]; then
    command_exists certbot || install_certbot
    info "Certbot $(certbot --version | head -n 1) ✓"
  fi
}

build_app() {
  info "安装 npm 依赖..."
  npm ci --ignore-scripts

  info "构建法条索引..."
  node scripts/build-law-index.mjs --no-embed

  info "构建 Next.js 生产包..."
  NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" npm run build

  [ -f ".next/standalone/server.js" ] || error "未找到 .next/standalone/server.js，构建结果异常"
}

setup_systemd() {
  local tmp_service
  tmp_service="$(mktemp)"

  render_template \
    "${TEMPLATE_DIR}/systemd/jobguard.service.template" \
    "$tmp_service"

  info "写入 systemd 服务..."
  sudo install -m 0644 "$tmp_service" "/etc/systemd/system/${SERVICE_NAME}.service"
  sudo systemctl daemon-reload
  sudo systemctl enable "${SERVICE_NAME}"
  sudo systemctl restart "${SERVICE_NAME}"
  rm -f "$tmp_service"

  if ! retry_http_check "http://127.0.0.1:${PORT}/api/health" 30 2; then
    sudo systemctl status "${SERVICE_NAME}" --no-pager || true
    error "应用启动失败，请检查 journalctl -u ${SERVICE_NAME} -f"
  fi
}

setup_nginx() {
  local tmp_nginx
  local site_target

  tmp_nginx="$(mktemp)"
  render_template \
    "${TEMPLATE_DIR}/nginx/jobguard.conf.template" \
    "$tmp_nginx"

  if [ -d /etc/nginx/sites-available ]; then
    site_target="/etc/nginx/sites-available/${SERVICE_NAME}.conf"
    sudo install -m 0644 "$tmp_nginx" "$site_target"
    sudo ln -sfn "$site_target" "/etc/nginx/sites-enabled/${SERVICE_NAME}.conf"
  else
    site_target="/etc/nginx/conf.d/${SERVICE_NAME}.conf"
    sudo install -m 0644 "$tmp_nginx" "$site_target"
  fi

  info "校验 Nginx 配置..."
  sudo nginx -t
  sudo systemctl enable nginx
  sudo systemctl restart nginx
  rm -f "$tmp_nginx"
}

setup_https() {
  [ "$SKIP_HTTPS" = true ] && return

  if ! getent hosts "$APP_DOMAIN" >/dev/null 2>&1; then
    warn "当前服务器无法解析 ${APP_DOMAIN}，Certbot 可能失败，请确认 DNS 已生效"
  fi

  info "申请并安装 HTTPS 证书..."
  sudo certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    --keep-until-expiring \
    -m "$LETSENCRYPT_EMAIL" \
    -d "$APP_DOMAIN"
}

print_summary() {
  local final_url
  if [ "$SKIP_HTTPS" = true ]; then
    final_url="http://${APP_DOMAIN}"
  else
    final_url="https://${APP_DOMAIN}"
  fi

  if retry_http_check "${final_url}/api/health" 20 2; then
    info "============================================"
    info "  JobGuard 部署成功!"
    info "  访问地址: ${final_url}"
    info "  健康检查: ${final_url}/api/health"
    info "  管理命令:"
    info "    sudo systemctl status ${SERVICE_NAME}"
    info "    sudo systemctl restart ${SERVICE_NAME}"
    info "    sudo journalctl -u ${SERVICE_NAME} -f"
    info "    sudo systemctl status nginx"
    info "============================================"
    return
  fi

  warn "应用已部署，但公网健康检查未通过"
  warn "请检查 DNS / 防火墙 / 证书状态后重试"
  warn "本机健康检查: http://127.0.0.1:${PORT}/api/health"
}

RUN_USER="${JOBGUARD_RUN_USER:-${SUDO_USER:-$(id -un)}}"
NODE_BIN="$(command -v node || true)"
EFFECTIVE_APP_URL=""

setup_env
setup_dependencies

NODE_BIN="$(command -v node || true)"
[ -n "$NODE_BIN" ] || error "未找到 node，请确认 Node.js 已正确安装"

build_app
setup_systemd
setup_nginx
setup_https
print_summary
