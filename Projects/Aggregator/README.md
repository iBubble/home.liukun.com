# 🌌 Airport Aggregator - 节点聚合与管理系统

**Airport Aggregator** 是一个功能强大的全栈代理节点聚合与管理工具。它集成了多源采集、智能筛选、连通性测试、纯净度检测以及灵活的导出功能，旨在为用户提供最优质、最纯净的代理节点资源。

---

## 📑 目录

- [核心特性](#-核心特性)
- [技术栈](#️-技术栈)
- [系统架构](#️-系统架构)
- [快速开始](#-快速开始)
- [API 接口](#-api-接口)
- [配置说明](#️-配置说明)
- [故障排除](#-故障排除)

---

## ✨ 核心特性

### 🚀 多源聚合采集
- 特色边缘回源直通：内置自定义服务器根配置（如香港、新加坡、美国边缘机器），特供直连免外网代理拦截技术，安全获取保底配置节点
- 支持从传统的订阅链接导入
- 深度集成 **Linux.do** 论坛，自动抓取并解析帖子中的节点资源
- 内置 Python 爬虫，自动从公开源获取最新节点
- 支持手动添加和管理自定义节点

### 🛡️ 智能纯净度检测
- 集成 IP 纯净度数据库，自动识别节点 ISP 属性
- 精准标记 **"家庭宽带"** 与 **"数据中心"** 流量
- 自动识别并降低高风险 ISP（如 Google、Amazon AWS 等）的评分
- 帮助用户避开"脏 IP"，提升节点质量

### ⚡ 真实连通性测试
- 调用 **Clash Core** 进行真实的落地连通性测试（非简单的 Ping）
- 引入底层 API 并发“绝对超时熔断网络防护”（防进程挂起/防死锁），即便在极度不稳定的劣质阻断环境也绝不卡死串行检测队列
- 支持批量 TCP 握手测试，快速筛选超时节点
- 多 URL 并行测试，确保节点真正可用

### 🔍 深度去重与清洗
- 构建了早期合并层的前置拦截预过滤能力，在源头级第一时间剥离冗余配置，从根源规避并发内存激增
- 采用严格的后置大包三维去重逻辑：基于 `Server IP + Port + UUID/Password` 精确判定
- 自动清理无效、重复或格式错误的节点配置
- 支持手动节点与自动采集节点的智能合并

### 📤 灵活导出
- **多格式支持**：一键导出为 Clash (YAML)、Sing-box (JSON) 或 Base64 通用订阅格式
- 支持将节点一键复制到剪贴板
- 自动生成优化的策略组配置

### 💻 现代 Web 界面
- 基于 Vue.js 3 构建的响应式前端
- 实时日志控制台：监控每一个抓取和测试步骤
- 可视化图表：国家/地区分布、协议类型占比一目了然
- 支持按国家/地区、协议类型、延迟、纯净度等多维度筛选和排序

---

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| **Backend** | Node.js, Express |
| **Frontend** | HTML5, Vue.js 3, TailwindCSS |
| **Core** | Clash Premium (Linux amd64) |
| **Addons** | Python 3.9+ (高级爬虫) |
| **Process Manager** | PM2 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web 前端 (Vue.js 3)                       │
│                   Projects/Aggregator/index.html                │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Node.js 后端 (app.js)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ HTTP API │  │ 订阅采集 │  │ 节点验证 │  │ 定时任务调度器  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                │               │
         ▼                ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐
│ Clash Core │  │ Python 爬虫 │  │ 外部 API           │
│ (验证节点)  │  │ (采集订阅)  │  │ (ip-api, ipwho.is) │
└─────────────┘  └─────────────┘  └─────────────────────┘
```

---

## � 快速开始

### 环境要求

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| **Linux** | amd64 架构 | 推荐 Ubuntu 20.04+ / Debian 11+ |
| **Node.js** | 16+ | 推荐使用 nvm 管理版本 |
| **Python** | 3.9+ | 用于高级爬虫功能 |
| **PM2** | 最新版 | 进程管理器 (可选但推荐) |

### 安装步骤

#### 1. 安装 Node.js 依赖
```bash
npm install
```

#### 2. 配置 Python 环境（可选）
```bash
# 创建虚拟环境
python3 -m venv myenv
source myenv/bin/activate

# 安装 Python 爬虫依赖
cd external/aggregator
pip install -r requirements.txt
```

#### 3. 确保 Clash 二进制可执行
```bash
chmod +x clash_bin/clash-linux-amd64-*
```

#### 4. 启动服务

**使用 PM2（推荐）：**
```bash
# 首次启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs aggregator

# 设置开机自启
pm2 startup
pm2 save
```

**直接启动（开发/调试）：**
```bash
node app.js
```

服务默认运行在 `http://localhost:3000`。

---

## 🔌 API 接口

### 节点操作

#### `POST /api/refresh`
触发 Github 订阅更新。

```bash
curl -X POST http://localhost:3000/api/refresh \
  -H "Content-Type: application/json" \
  -d '{"pages": 50}'
```

#### `POST /api/fetch_all`
触发全网节点获取（包括 Github + Linux.do + 网站抓取）。

```bash
curl -X POST http://localhost:3000/api/fetch_all \
  -H "Content-Type: application/json" \
  -d '{"pages": 100}'
```

#### `GET /api/proxies`
获取所有节点列表。

```bash
curl http://localhost:3000/api/proxies
```

#### `GET /api/status`
获取当前任务状态。

```json
{
  "status": "idle",      // idle | fetching | testing
  "total": 500,          // 总节点数
  "active": 120,         // 有效节点数
  "logs": [...],         // 最近日志
  "lastUpdated": "2026-02-12T00:00:00Z"
}
```

### 导出接口

#### `GET /api/convert?type={format}`

| 参数 | 说明 |
|------|------|
| `type=clash` | 导出 Clash YAML 配置 |
| `type=base64` | 导出 Base64 编码订阅 |
| `type=singbox` | 导出 Sing-box JSON 配置 |

```bash
# 下载 Clash 配置
curl -o config.yaml "http://localhost:3000/api/convert?type=clash"
```

### 检测接口

#### `POST /api/check_connectivity`
批量检测节点 TCP 连通性。

#### `POST /api/check_ip_batch`
批量检测 IP 纯净度。

---

## ⚙️ 配置说明

### Clash 配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `mixed-port` | 7890 | HTTP/SOCKS5 混合端口 |
| `external-controller` | 127.0.0.1:9090 | 外部控制器地址 |
| `log-level` | warning | 日志级别 |

### Linux.do Cookie 配置

将 Cookie 保存到 `linuxdo_cookie.txt`：
```
_forum_session=xxx; _t=xxx; ...
```

---

## 🔧 故障排除

### 常见问题

#### 1. 服务无法启动
```bash
# 检查端口占用
lsof -i :3000

# 检查 PM2 状态
pm2 status
pm2 logs aggregator --lines 100

# 手动启动调试
node app.js
```

#### 2. Clash 启动失败
```bash
# 检查二进制权限
chmod +x clash_bin/clash-linux-amd64-*

# 检查配置文件
cat clash_bin/config.yaml

# 手动测试运行
./clash_bin/clash-linux-amd64-* -d clash_bin -f clash_bin/config.yaml
```

#### 3. Python 爬虫失败
```bash
# 检查 Python 环境
python3 --version

# 检查依赖
pip list

# 手动运行爬虫
cd external/aggregator
python3 subscribe/collect.py --pages 10
```

---

## 📝 许可证

本项目仅供学习和研究使用。请遵守当地法律法规。

---

## � 致谢

- [wzdnzd/aggregator](https://github.com/wzdnzd/aggregator) - Python 爬虫核心
- [Clash](https://github.com/Dreamacro/clash) - 代理核心
- [Vue.js](https://vuejs.org/) - 前端框架
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架