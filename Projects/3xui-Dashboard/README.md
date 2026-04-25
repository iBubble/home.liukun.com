# 3x-ui 统一管理 Dashboard

> 将多台海外服务器的 3x-ui 面板聚合到一个赛博朋克风格的 Web 管理页面，并集成自动化全节点网络测速功能。  
> 在线地址：`https://home.liukun.com/Projects/3xui-Dashboard/`

---

## 一、架构设计

```
浏览器 ──HTTPS──▶ home.liukun.com/Projects/3xui-Dashboard/
                       ├── index.html       (前端 SPA，包含测速 UI)
                       ├── style.css        (赛博朋克主题)
                       ├── app.js           (前端逻辑，包含自动测速引擎)
                       └── api/
                           ├── config.php       (服务器凭据 & Dashboard 密码)
                           ├── proxy.php        (核心 API 代理 & 历史记录存取)
                           ├── speedproxy.php   (独立的高性能测速数据中继代理)
                           ├── speedtest.php    (测速页面 iframe 同源桥接层)
                           ├── speed_history.json (测速历史持久化存储)
                           └── sub.php          (Clash 订阅生成器)
```

### 核心思路
- **前端不直连**：面板数据和测速数据均通过 PHP 后端代理，完美避开跨域（CORS）限制。
- **无状态后端**：依靠 PHP cURL 管理各个海外服务器的 Session Cookie，保护真实凭据。
- **并行与隔离**：主控制面板 API（`proxy.php`）与测速 XHR 中继（`speedproxy.php`）物理隔离，互不阻塞，保证高并发下界面的流畅响应。

---

## 二、技术栈

| 层 | 技术 | 说明 |
|:--|:--|:--|
| 前端 | HTML + Vanilla CSS + JS | 无框架，纯原生，内置图表渲染与消息桥接 |
| 后端 | PHP 8.3 + cURL | 负责 REST API 转发、跨域代理、数据持久化 |
| 测速核心 | OpenSpeedTest | 纯 JS 测速引擎，经 iframe 包装注入 |
| 存储 | JSON 文件 | 轻量级的服务器端测速历史记录存储 |
| 风格 | 赛博朋克 | 霓虹发光、扫描线动画、深色背景 |

---

## 三、文件清单

```text
3xui-Dashboard/
├── index.html          # 页面骨架：登录、服务器卡片、图表区、测速沙盒
├── style.css           # 赛博朋克 UI 主题
├── app.js              # 控制流：数据拉取、DOM 渲染、测速队列调度、历史计算
├── api/
│   ├── config.php      # 服务器 IP、端口、管理员账号密码等机密信息
│   ├── proxy.php       # 主代理：登录、获取流量状态、重置流量、历史记录读写
│   ├── speedproxy.php  # 测速代理：专门处理 OpenSpeedTest 的大文件下载/上传请求
│   ├── speedtest.php   # 资源代理：将跨域的 SVG/JS 转换到同源环境以绕过 iframe 限制
│   ├── sub.php         # 订阅代理：提取 VLESS 节点并生成 Clash YAML
│   └── speed_history.json # 数据层：保存服务器测速的延迟与带宽记录（PHP自动生成）
└── README.md           # 本文档
```

---

## 四、核心功能详解

### 4.1 节点管理与状态聚合
- **统一登录**：支持 `ALL / HK / SG / US` 等选项卡，一键切换不同区域的服务器。
- **流量监控**：实时展示入站节点的总流量、上下行消耗，以彩色进度条的形式呈现使用情况。
- **一键重置**：每个客户端独立操作，提供防误触确认。
- **Clash 自动订阅**：后台自动爬取并解析 `VLESS + Reality` 节点，包含完整的 SNI 与 Short ID 处理，输出免配置订阅链。

### 4.2 全自动化网络测速系统（v4）
Dashboard 内置了基于 `OpenSpeedTest` 魔改的全自动测速队列机制：
1. **沙盒隔离机制**：使用隐藏的 `<iframe id="speedIframe">` 动态装载测速引擎。
2. **同源绕过（CORS）**：`speedtest.php` 动态拦截和替换外部域名的资源路径，将其包装为同源请求，从而获得了对 `contentDocument` 注入 DOM 的最高权限。
3. **高并发中继**：测速期间产生的高频 XHR 请求（下载大垃圾文件、上传大负载）被发送给 `speedproxy.php`，由于没有任何验证负担，它可以全速将网络包中继给目的服务器，**实现准确测算从 Dashboard 主服务器到海外节点的物理宽带**。
4. **实时桥接通讯**：被注入沙盒的 JS 每秒读取 DOM 中的进度数值，通过 `window.parent.postMessage` 与父页面通讯。
5. **智能队列调度**：支持自动遍历所有节点，自动触发测速、超时阻断（90s）、结果采集，并最终在“测速结果总览”渲染直观的柱状图。

### 4.3 测速历史与智能算法
- **数据持久化**：每次测速成功后，包含了 `Download`、`Upload`、`Ping`、`Jitter` 以及时间戳的记录会被 POST 给后端。
- **滚动存储**：`speed_history.json` 为每台服务器自动只保留最近 **20 次** 历史，防止文件无限膨胀。
- **自动平均值计算**：面板拉取历史记录后，将自动剔除无效数据，计算各项指标的历史均值，并呈现在各节点名称的下方（如 `历史平均: ↓ 65.2 ↑ 36.8 | P: 190ms J: 10ms`）。

---

## 五、后端 API 接口汇总

### 5.1 proxy.php（管理与数据接口）
*所有请求均需要 Header: `X-Auth: base64(username:password)`*

| action | 方法 | 参数 | 功能 |
|:--|:--|:--|:--|
| `login` | POST | `{username, password}` | 登录验证 |
| `get_all` | GET | 无 | 获取所有面板的 Inbounds 列表与主机状态 |
| `reset_traffic` | GET | `server`, `id`, `email` | 重置目标客户端流量 |
| `get_speed_history` | GET | 无 | 读取服务器端的 `speed_history.json` |
| `save_speed_history`| POST | `{server, down, up, ping, jitter}` | 记录一次新的测速结果 |

### 5.2 sub.php（订阅接口）
| 参数 | 功能 |
|:--|:--|
| `token` | GET 传入，即 `base64(账号:密码)` |

### 5.3 speedproxy.php（专线测速代理）
*无鉴权，专注转发大流量。*
| 路由参数 | 功能 |
|:--|:--|
| `?server={key}&action=download` | 代理 OpenSpeedTest 发往远端的下载块 |
| `?server={key}&action=upload`   | 代理 OpenSpeedTest 发往远端的上传块 |
| `?server={key}&action=ping`     | 空白探测响应，用于测量延迟抖动 |

---

## 六、部署指南

1. **环境依赖**：
   - PHP >= 8.1
   - cURL 扩展
   - 目标目录需赋予 `www`（或相应的 PHP 进程用户）**读写权限**，以允许创建/写入 `speed_history.json`。
2. **初始化配置**：
   编辑 `api/config.php`，配置 Dashboard 的主密码及后端服务器列阵：
   ```php
   define('DASH_USER', 'YourUsername');
   define('DASH_PASS', 'YourPassword');
   define('SERVERS', [
       'hk' => ['name'=>'Hong Kong', 'host'=>'hk.example.com', 'port'=>9528, ...],
   ]);
   ```
3. **缓存刷新**：
   当修改了 `style.css` 或 `app.js`，需要在 `index.html` 底部修改加载版本号 `?v=xx` 以破除浏览器缓存。

---

*文档最近更新：2026-04-26*  
*架构支持：PHP 8.3 / REST API / PostMessage Event Bus*
