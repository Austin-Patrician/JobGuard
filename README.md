<div align="center">

# JobGuard

**求职防骗互动平台 — 识别招聘陷阱，守护每一份 offer**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

[在线演示](#) · [功能介绍](#功能介绍) · [快速开始](#快速开始) · [项目结构](#项目结构) · [参与贡献](#参与贡献)

</div>

---

## 简介

JobGuard 是一个面向求职场景的交互式风险识别与情报共建平台。通过剧情闯关、AI 工具箱与社区情报三大模块，帮助用户在真实求职流程中识别常见的招聘欺诈、合同陷阱与入职套路。

> **为什么需要 JobGuard？** 每年有大量求职者因信息不对称遭遇招聘骗局。JobGuard 将枯燥的法律条文转化为可交互的游戏体验，并借助 AI 与社区力量构建实时防骗情报网。

## 功能介绍

### 剧情闯关

多关卡互动式训练，在模拟场景中学习识别招聘陷阱：

| 关卡 | 玩法 | 训练目标 |
|------|------|----------|
| **黄金眼** | 快速识别文本中的违规话术 | 提升信息筛选速度 |
| **话术攻防** | 模拟 HR 对话，选择最佳应对 | 掌握谈判话术 |
| **合同迷宫** | 在合同条款中找出陷阱 | 熟悉劳动法核心条款 |

### AI 工具箱

| 工具 | 说明 |
|------|------|
| **照妖镜** | 上传招聘截图或粘贴文本，AI 逐句分析风险点 |
| **合同审查** | 上传劳动合同图片（最多 10 页）或粘贴文本，AI 标注不合规条款 |
| **法律顾问** | 基于《劳动法》和《劳动合同法》的 RAG 问答，精准引用法条 |

### 社区情报局

- 匿名提交求职避坑经历，AI 自动脱敏、分类、审核
- 按地区 / 行业 / 标签浏览，地图可视化全国情报热力分布
- 投票机制，优质情报自然浮现

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| 前端 | [React 19](https://react.dev/) · [TypeScript 5.9](https://www.typescriptlang.org/) |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) |
| 动画 | [Framer Motion](https://motion.dev/) · [GSAP](https://gsap.com/) · [PixiJS](https://pixijs.com/) · [Lottie](https://airbnb.design/lottie/) |
| 地图 | [MapLibre GL](https://maplibre.org/) · [React Map GL](https://visgl.github.io/react-map-gl/) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/) · OpenAI 兼容 API |
| 数据库 | [PostgreSQL](https://www.postgresql.org/) |
| 状态管理 | [Zustand](https://zustand-demo.pmnd.rs/) |

## 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [PostgreSQL](https://www.postgresql.org/) >= 14
- OpenAI 兼容的 API Key（如 OpenAI、DeepSeek 等）

### 1) 克隆仓库

```bash
git clone https://github.com/Austin-Patrician/JobGuard.git
cd JobGuard
```

### 2) 安装依赖

```bash
npm install
```

### 3) 配置环境变量

复制 `.env` 模板并填入你的配置：

```bash
cp .env .env.local
```

```env
# App
NEXT_PUBLIC_APP_NAME=JobGuard
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI (OpenAI 兼容接口)
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1

# Database
DATABASE_URL=postgres://user:password@localhost:5432/jobguard
PGSSLMODE=require

# Security
IP_HASH_SALT=your-random-salt-string
```

### 4) 初始化数据库

```sql
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  raw_content text NOT NULL,
  sanitized_content text,
  summary text,
  tags text[],
  region text,
  city text,
  industry text,
  scam_type text,
  status text NOT NULL DEFAULT 'pending',
  reject_reason text,
  ip_hash text,
  upvotes integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_votes (
  report_id uuid NOT NULL REFERENCES community_reports(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, visitor_id)
);
```

### 5) 构建法条索引（可选，提升法律顾问检索精度）

```bash
npm run build:law-index
```

### 6) 启动

```bash
# 开发环境
npm run dev

# 生产构建
npm run build && npm start
```

访问 http://localhost:3000

## 项目结构

```
JobGuard/
├── public/                  # 静态资源
├── src/
│   ├── app/
│   │   ├── (auth)/          # 登录 / 注册页面
│   │   ├── (main)/          # 主功能页面
│   │   │   ├── community/   #   情报局
│   │   │   ├── dashboard/   #   首页仪表盘
│   │   │   ├── game/        #   剧情闯关
│   │   │   │   └── level/   #     各关卡实现
│   │   │   ├── law-chat/    #   法律顾问
│   │   │   └── toolkit/     #   AI 工具箱
│   │   │       ├── mirror/  #     照妖镜
│   │   │       └── contract/#     合同审查
│   │   └── api/             # API Route Handlers
│   ├── components/          # 可复用组件
│   │   ├── ui/              #   基础 UI 组件
│   │   ├── layout/          #   布局组件
│   │   ├── community/       #   情报局组件
│   │   └── law/             #   法律模块组件
│   ├── data/                # 静态数据 / 脚本
│   │   ├── law/             #   法律法规原文与索引
│   │   └── scripts/         #   游戏脚本数据
│   ├── lib/                 # 工具函数与服务
│   ├── stores/              # Zustand 状态管理
│   └── types/               # TypeScript 类型定义
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发环境 (Turbopack) |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 代码检查 |
| `npm run build:law-index` | 构建法条向量索引 |

## 安全

JobGuard 实施了多层安全防护：

- **速率限制** — 全局 60 请求/分钟/IP，AI 接口 5 请求/分钟/IP
- **请求体大小限制** — 各端点按需设置上限，防止超大 payload 攻击
- **安全响应头** — CSP、HSTS、X-Frame-Options 等
- **Markdown XSS 防护** — 社区内容渲染使用 rehype-sanitize
- **IP 哈希** — 社区模块仅存储 IP 的 SHA-256 哈希，不存储原始 IP

如果发现安全漏洞，请通过 [Issue](https://github.com/Austin-Patrician/JobGuard/issues) 私下报告，不要公开披露。

## 参与贡献

欢迎任何形式的贡献！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

**请确保：**
- 代码通过 `npm run lint`
- 新功能附带必要说明
- 不要提交密钥或敏感信息

## Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=Austin-Patrician/JobGuard&type=Date)](https://star-history.com/#Austin-Patrician/JobGuard&Date)

</div>

## License

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

**如果这个项目对你有帮助，请给一个 Star 支持一下！**

</div>

本项目已经加入LINUX DO开源社区 : [LINUX DO](https://linux.do/) 
