<#
.SYNOPSIS
    JobGuard 一键部署脚本 - Windows 版
.DESCRIPTION
    在 Windows 上构建并启动 JobGuard
.PARAMETER Port
    监听端口，默认 3000
.PARAMETER SkipDeps
    跳过 Node.js 检测和 npm install
.PARAMETER BuildOnly
    仅构建，不启动
.EXAMPLE
    .\deploy-windows.ps1
    .\deploy-windows.ps1 -Port 8080
    .\deploy-windows.ps1 -BuildOnly
#>
param(
    [int]$Port = 3000,
    [switch]$SkipDeps,
    [switch]$BuildOnly
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# ── 辅助函数 ──────────────────────────────────────────────────────────────────
function Write-Info  { Write-Host "[INFO]  $args" -ForegroundColor Green }
function Write-Warn  { Write-Host "[WARN]  $args" -ForegroundColor Yellow }
function Write-Err   { Write-Host "[ERROR] $args" -ForegroundColor Red; exit 1 }

# ── Node.js 检测 ──────────────────────────────────────────────────────────────
if (-not $SkipDeps) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Warn "未检测到 Node.js"
        $install = Read-Host "是否通过 winget 安装 Node.js 22? [Y/n]"
        if ($install -eq "" -or $install -match "^[Yy]") {
            Write-Info "安装 Node.js 22..."
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            # 刷新 PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
            if (-not $nodeCmd) {
                Write-Err "Node.js 安装后未生效，请关闭终端重新打开后重试"
            }
        } else {
            Write-Err "请手动安装 Node.js >= 20: https://nodejs.org/"
        }
    }

    $nodeVer = (node -v) -replace 'v(\d+)\..*', '$1'
    if ([int]$nodeVer -lt 20) {
        Write-Err "Node.js 版本过低 ($(node -v))，需要 >= 20"
    }
    Write-Info "Node.js $(node -v)"
}

# ── .env 检查 ─────────────────────────────────────────────────────────────────
if (-not (Test-Path .env)) {
    Write-Warn ".env 文件不存在"
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Warn "已从 .env.example 复制，请编辑 .env 填入真实配置后重新运行"
        notepad .env
        exit 1
    } else {
        Write-Err "未找到 .env.example，请手动创建 .env 文件"
    }
}

# 检查 OPENAI_API_KEY
$envContent = Get-Content .env -Raw
if ($envContent -match "OPENAI_API_KEY=your-openai-key" -or $envContent -notmatch "OPENAI_API_KEY=\S+") {
    Write-Warn "OPENAI_API_KEY 未配置，AI 功能将不可用"
}

# ── 安装依赖 ──────────────────────────────────────────────────────────────────
Write-Info "安装 npm 依赖..."
npm ci --ignore-scripts
if ($LASTEXITCODE -ne 0) { Write-Err "npm ci 失败" }

# ── 构建法条索引 ──────────────────────────────────────────────────────────────
Write-Info "构建法条索引..."
node scripts/build-law-index.mjs --no-embed
if ($LASTEXITCODE -ne 0) { Write-Err "法条索引构建失败" }

# ── 构建 Next.js ─────────────────────────────────────────────────────────────
Write-Info "构建 Next.js 生产包..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Next.js 构建失败" }

if ($BuildOnly) {
    Write-Info "构建完成（仅构建模式）"
    Write-Info "手动启动: `$env:PORT=$Port; npm run start"
    exit 0
}

# ── 启动方式选择 ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Info "构建完成! 请选择启动方式:"
Write-Host "  1) 直接前台启动 (适合测试)"
Write-Host "  2) 注册为 Windows 服务 (需要管理员权限)"
Write-Host "  3) 创建开机启动快捷方式"
Write-Host ""
$choice = Read-Host "请选择 [1/2/3] (默认 1)"
if ($choice -eq "") { $choice = "1" }

switch ($choice) {
    "1" {
        Write-Info "前台启动 JobGuard (端口 $Port)..."
        Write-Info "按 Ctrl+C 停止"
        Write-Host ""
        $env:PORT = $Port
        $env:HOSTNAME = "0.0.0.0"
        npm run start -- -p $Port
    }
    "2" {
        # 使用 nssm 注册 Windows 服务
        $nssmPath = Get-Command nssm -ErrorAction SilentlyContinue
        if (-not $nssmPath) {
            Write-Warn "需要 nssm (Non-Sucking Service Manager) 来注册 Windows 服务"
            $installNssm = Read-Host "是否通过 winget 安装 nssm? [Y/n]"
            if ($installNssm -eq "" -or $installNssm -match "^[Yy]") {
                winget install nssm --accept-package-agreements --accept-source-agreements
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            } else {
                Write-Warn "跳过服务注册，改为前台启动"
                $env:PORT = $Port; $env:HOSTNAME = "0.0.0.0"; npm run start -- -p $Port
                return
            }
        }

        $nodePath = (Get-Command node).Source
        $serverJs = Join-Path $PSScriptRoot ".next\standalone\server.js"

        Write-Info "注册 Windows 服务 'JobGuard'..."
        nssm install JobGuard "$nodePath" "$serverJs"
        nssm set JobGuard AppDirectory "$PSScriptRoot"
        nssm set JobGuard AppEnvironmentExtra "NODE_ENV=production" "PORT=$Port" "HOSTNAME=0.0.0.0"
        nssm set JobGuard Description "JobGuard - 求职防坑工具箱"
        nssm set JobGuard Start SERVICE_AUTO_START
        nssm start JobGuard

        Start-Sleep -Seconds 3
        Write-Info "============================================"
        Write-Info "  JobGuard 已注册为 Windows 服务!"
        Write-Info "  访问地址: http://localhost:$Port"
        Write-Info "  管理命令:"
        Write-Info "    nssm status  JobGuard"
        Write-Info "    nssm restart JobGuard"
        Write-Info "    nssm stop    JobGuard"
        Write-Info "    nssm remove  JobGuard confirm"
        Write-Info "============================================"
    }
    "3" {
        $startupDir = [Environment]::GetFolderPath("Startup")
        $shortcutPath = Join-Path $startupDir "JobGuard.bat"
        $batContent = @"
@echo off
cd /d "$PSScriptRoot"
set PORT=$Port
set HOSTNAME=0.0.0.0
set NODE_ENV=production
node .next\standalone\server.js
"@
        Set-Content -Path $shortcutPath -Value $batContent -Encoding UTF8
        Write-Info "已创建开机启动脚本: $shortcutPath"
        Write-Info "正在启动..."
        Start-Process cmd.exe -ArgumentList "/c", $shortcutPath

        Start-Sleep -Seconds 3
        Write-Info "============================================"
        Write-Info "  JobGuard 部署成功!"
        Write-Info "  访问地址: http://localhost:$Port"
        Write-Info "  开机自启: $shortcutPath"
        Write-Info "============================================"
    }
}
