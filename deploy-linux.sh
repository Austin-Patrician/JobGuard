#!/usr/bin/env bash
#
# JobGuard 一键部署脚本 — Linux 版 (裸机 / VM)
# 用法: bash deploy-linux.sh [--port 3000] [--skip-deps]
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
PORT=3000
SKIP_DEPS=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)       PORT="$2"; shift 2 ;;
    --skip-deps)  SKIP_DEPS=true; shift ;;
    *)            shift ;;
  esac
done

# ── Node.js 检测 ──────────────────────────────────────────────────────────────
install_node() {
  info "正在通过 NodeSource 安装 Node.js 22..."
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v yum >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
    sudo yum install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
    sudo dnf install -y nodejs
  else
    error "无法自动安装 Node.js，请手动安装 Node.js >= 20: https://nodejs.org/"
  fi
}

if [ "$SKIP_DEPS" = false ]; then
  if ! command -v node >/dev/null 2>&1; then
    warn "未检测到 Node.js"
    read -rp "是否自动安装 Node.js 22? [Y/n] " yn
    case "${yn:-Y}" in
      [Yy]*) install_node ;;
      *)     error "请手动安装 Node.js >= 20 后重试" ;;
    esac
  fi

  NODE_VER=$(node -v | grep -oP '\d+' | head -1)
  if [ "$NODE_VER" -lt 20 ]; then
    error "Node.js 版本过低 ($(node -v))，需要 >= 20"
  fi
  info "Node.js $(node -v) ✓"
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

# ── 安装依赖 ──────────────────────────────────────────────────────────────────
info "安装 npm 依赖..."
npm ci --ignore-scripts

# ── 构建法条索引 ──────────────────────────────────────────────────────────────
info "构建法条索引..."
node scripts/build-law-index.mjs --no-embed

# ── 构建 Next.js ─────────────────────────────────────────────────────────────
info "构建 Next.js 生产包..."
npm run build

# ── 创建 systemd 服务（可选）──────────────────────────────────────────────────
setup_systemd() {
  local SERVICE_FILE="/etc/systemd/system/jobguard.service"
  info "创建 systemd 服务..."
  sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=JobGuard - 求职防坑工具箱
After=network.target postgresql.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${SCRIPT_DIR}
EnvironmentFile=${SCRIPT_DIR}/.env
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=HOSTNAME=0.0.0.0
ExecStart=$(which node) ${SCRIPT_DIR}/.next/standalone/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable jobguard
  sudo systemctl restart jobguard
  info "systemd 服务已创建并启动"
}

# ── 启动方式选择 ──────────────────────────────────────────────────────────────
echo ""
info "构建完成! 请选择启动方式:"
echo "  1) 直接前台启动 (适合测试)"
echo "  2) 注册 systemd 服务 (适合生产，需要 sudo)"
echo "  3) 不启动，仅构建"
echo ""
read -rp "请选择 [1/2/3]: " choice

case "${choice:-1}" in
  1)
    info "前台启动 JobGuard (端口 ${PORT})..."
    info "按 Ctrl+C 停止"
    echo ""
    PORT="$PORT" HOSTNAME=0.0.0.0 npm run start -- -p "$PORT"
    ;;
  2)
    setup_systemd
    sleep 2
    if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
      info "============================================"
      info "  JobGuard 部署成功!"
      info "  访问地址: http://localhost:${PORT}"
      info "  管理命令:"
      info "    systemctl status  jobguard"
      info "    systemctl restart jobguard"
      info "    journalctl -u jobguard -f"
      info "============================================"
    else
      warn "服务正在启动，请稍后检查: systemctl status jobguard"
    fi
    ;;
  3)
    info "构建完成，可手动启动:"
    info "  PORT=${PORT} HOSTNAME=0.0.0.0 npm run start"
    info "  或: PORT=${PORT} node .next/standalone/server.js"
    ;;
esac
