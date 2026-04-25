# 3x-ui 统一管理 Dashboard

> 将多台海外服务器的 3x-ui 面板聚合到一个赛博朋克风格的 Web 管理页面。  
> 在线地址：`https://home.liukun.com/Projects/3xui-Dashboard/`

---

## 一、架构设计

```
浏览器 ──HTTPS──▶ home.liukun.com/Projects/3xui-Dashboard/
                       ├── index.html     (前端 SPA)
                       ├── style.css      (赛博朋克主题)
                       ├── app.js         (前端逻辑)
                       └── api/
                           ├── config.php (服务器凭据 & Dashboard 密码)
                           ├── proxy.php  (后端 API 代理层)
                           └── sub.php    (Clash 订阅生成器)
                                  │ PHP cURL 转发 (绕过 CORS)
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                  ▼
     hk.liukun.com:9528    sg.liukun.com:9528    us.liukun.com:9528
     (3x-ui REST API)      (3x-ui REST API)      (3x-ui REST API)
```

### 核心思路
- **前端不直连** 3x-ui 面板 → 避免 CORS 和凭据泄露
- **PHP 后端代理** 统一管理三台服务器的 Session Cookie
- **Token 鉴权** 保护 Dashboard 和订阅链接

---

## 二、技术栈

| 层 | 技术 | 说明 |
|:--|:--|:--|
| 前端 | HTML + Vanilla CSS + JS | 无框架，纯原生，单页应用 |
| 后端 | PHP 8.3 + cURL | 宝塔面板自带运行时 |
| API 来源 | 3x-ui REST API | `/panel/api/inbounds/*` |
| 部署 | Nginx + 宝塔 | 静态文件 + PHP-FPM |
| 风格 | 赛博朋克 | 与 home.liukun.com 整体风格一致 |

---

## 三、文件清单

```
3xui-Dashboard/
├── index.html          # 页面骨架：登录门禁 + Header + 服务器卡片 + Tab + 数据表格
├── style.css           # 赛博朋克主题（霓虹 cyan/magenta/green、扫描线动画）
├── app.js              # 前端逻辑：鉴权、API 调用、渲染、自动刷新、订阅链接
├── api/
│   ├── config.php      # 所有服务器连接配置 + Dashboard 登录凭据
│   ├── proxy.php       # API 代理层：转发请求、管理 Cookie、处理鉴权
│   └── sub.php         # Clash 订阅生成器：动态拉取配置输出 YAML
└── README.md           # 本文档
```

---

## 四、后端 API 接口

### 4.1 proxy.php（API 代理）

所有请求需携带 Header `X-Auth: base64(用户名:密码)`。

| action | 方法 | 参数 | 说明 |
|:--|:--|:--|:--|
| `login` | GET | `username`, `password` | Dashboard 登录验证 |
| `get_all` | GET | 无 | 聚合所有服务器的入站列表 + 服务器状态 + 在线连接 |
| `reset_traffic` | GET | `server`, `id`, `email` | 重置指定客户端流量 |

**`get_all` 返回结构：**

```json
{
  "success": true,
  "time": "2026-04-02 23:00:00",
  "data": {
    "hk": {
      "name": "Hong Kong", "flag": "🇭🇰",
      "online": true,
      "inbounds": [/* 3x-ui 入站对象数组 */],
      "status": {/* 服务器状态：cpu, mem, uptime */},
      "onlines": ["tv8wwb3l"]  // 当前在线客户端 email 列表
    },
    "sg": { /* ... */ },
    "us": { /* ... */ }
  }
}
```

### 4.2 sub.php（Clash 订阅）

| 参数 | 说明 |
|:--|:--|
| `token` | `base64(用户名:密码)` 鉴权令牌 |

**订阅链接：**
```
https://home.liukun.com/Projects/3xui-Dashboard/api/sub.php?token=R2VtaW5pOkdsNTE4MTA4MQ==
```

**动态生成逻辑：**
1. 逐一登录三台 3x-ui → 拉取 VLESS 入站配置
2. 从 `settings` 提取 UUID、flow
3. 从 `streamSettings.realitySettings` 提取 SNI、public-key（注意路径在 `.settings.publicKey`）、short-id
4. 输出标准 Clash YAML：`proxies` → `proxy-groups` → `rules`

**节点命名规则：** `Gemini-HK` / `Gemini-HK1` / `Gemini-SG` / `Gemini-US`（基于服务器 key 生成）

---

## 五、3x-ui API 参考

3x-ui 面板通过 REST API 暴露管理接口，需先 POST `/login` 获取 Session Cookie。

| 接口 | 方法 | 说明 |
|:--|:--|:--|
| `/login` | POST | 登录，参数 `username` + `password`，返回 Set-Cookie |
| `/panel/api/inbounds/list` | GET | 获取所有入站及其客户端配置 |
| `/panel/api/inbounds/onlines` | POST | 获取当前在线连接的客户端 email 列表 |
| `/panel/api/inbounds/{id}/resetClientTraffic/{email}` | POST | 重置指定客户端流量 |
| `/server/status` | POST | 获取服务器 CPU/RAM/运行时间 |

**Reality 配置数据路径（重要）：**
```
inbound.streamSettings (JSON 字符串) → 解析后：
  ├── network: "tcp"
  ├── security: "reality"
  └── realitySettings:
        ├── serverNames: ["www.microsoft.com"]
        ├── shortIds: ["5533c7eacde28fb0", ...]
        ├── privateKey: "..." (服务端私钥，不用于客户端)
        └── settings:
              └── publicKey: "Dgc613Ih9stTC8FYHj0Q3bhKr4IRf9T25WfQ8dbdYGA"
```

---

## 六、前端设计要点

### 6.1 赛博朋克色彩系统
```css
--cyan: #00ffff;    /* 主色调：标题、边框、交互 */
--magenta: #ff00ff; /* 强调色：Header 底线、入站标题 */
--green: #00ff41;   /* 状态色：在线、数据值 */
--yellow: #ffd700;  /* 警告色：即将过期 */
--red: #ff3333;     /* 错误/危险色 */
```

### 6.2 关键交互
- **登录门禁**：sessionStorage 存储 base64 凭据，刷新不丢失
- **自动刷新**：30 秒轮询 `get_all`，可通过右上角 checkbox 开关
- **Tab 切换**：ALL / HK / SG / US 筛选入站数据
- **流量重置**：每个客户端旁的「重置」按钮，confirm 确认后调用 API
- **订阅复制**：点击「📋 订阅」按钮 → 一键复制 Clash 订阅 URL 到剪贴板

### 6.3 MIXED 入站处理
MIXED/SOCKS5 协议的入站无命名客户端（`settings.clients` 为空），但入站对象本身有 `up`/`down` 流量字段。前端对此特殊处理：展示入站级流量表格 + 「● 有流量」状态指示。

### 6.4 服务器分组可视化
同一台服务器的多个入站（如 VLESS + MIXED）被包裹在 `.server-group` 容器中，通过**彩色左边框**区分：

| 服务器 | 左边框颜色 | CSS 变量 |
|:--|:--|:--|
| 🇭🇰 Hong Kong | 🟢 绿色 | `var(--green)` |
| 🇸🇬 Singapore | 🔵 青色 | `var(--cyan)` |
| 🇺🇸 United States | 🟣 品红色 | `var(--magenta)` |

每组包含标题栏（国旗+名称+入站数+在线数）+ 子入站区块。

### 6.5 图形化流量条状图
在每个入站 header 行的背景渲染一个**渐变比例条**，直观对比各入站的流量大小：
- **计算基准**：第一遍扫描全部入站，取最大流量值作为 **50% 宽度基准**
- **渲染方式**：CSS `linear-gradient(90deg, rgba(颜色,.15) X%, transparent X%)`
- **颜色映射**：HK=`0,255,65` / SG=`0,255,255` / US=`255,0,255`
- **流量标签**：header 标题旁显示该入站具体流量值（如 `5.84 GB`）

---

## 七、安全机制

| 层 | 措施 |
|:--|:--|
| Dashboard 访问 | 登录门禁，凭据通过 `X-Auth` Header 传递 |
| API 代理 | 每个请求校验 `X-Auth`，未授权返回 401 |
| 订阅链接 | Token 参数鉴权，拒绝无 Token 请求 |
| 3x-ui 凭据 | 仅存储在服务器端 `config.php`，不对前端暴露 |
| Cookie 管理 | PHP 端存储在 `sys_get_temp_dir()/3xui_sess/`，按 host 哈希隔离 |

---

## 八、部署与维护

### 8.1 部署步骤
```bash
# 从本地推送到服务器
scp -r 3xui-Dashboard/ gemini-server:/www/wwwroot/ibubble.vicp.net/Projects/

# 验证 PHP 可用
ssh gemini-server "php -v"  # 需要 PHP 8.x + cURL 扩展
```

### 8.2 修改配置
编辑 `api/config.php`：
```php
define('DASH_USER', 'Gemini');          // Dashboard 登录用户名
define('DASH_PASS', 'Gl5181081');       // Dashboard 登录密码
define('SERVERS', [
    'hk' => ['host'=>'hk.liukun.com', 'port'=>9528, 'basePath'=>'/admin_3x/', ...],
    'sg' => ['host'=>'sg.liukun.com', ...],
    'us' => ['host'=>'us.liukun.com', ...],
]);
```

### 8.3 新增/删除服务器
在 `config.php` 的 `SERVERS` 数组中增减条目即可，前端和订阅链接自动适配。

### 8.4 修改分流规则
编辑 `api/sub.php` 底部的 `RULES` heredoc 区块。

### 8.5 缓存问题
修改 `app.js` 或 `style.css` 后，需在 `index.html` 中更新版本号：
```html
<link rel="stylesheet" href="style.css?v=4">
<script src="app.js?v=7"></script>
```

---

## 九、项目入口集成

已在 `home.liukun.com/projects.html` 中新增卡片：
- 标题：3x-ui 统一管理
- 描述：海外服务器面板聚合管理
- 链接：`/Projects/3xui-Dashboard/`

---

*文档更新时间：2026-04-03 00:20*  
*技术栈版本：PHP 8.3 · Nginx · 3x-ui REST API*
