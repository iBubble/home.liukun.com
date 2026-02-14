# Linux.do Cookie 更新指南

## 当前状态
❌ Cookie 已失效（403 Forbidden）

## 两种更新方案

---

## 方案1：手动更新（立即可用）⚡

### 步骤：

1. **在你的 Mac 上用浏览器登录 linux.do**
   - 访问：https://linux.do
   - 使用 Gmail 账号登录（ibubble@gmail.com）

2. **获取 Cookie**
   - 按 `F12` 打开开发者工具
   - 切换到 `Application` 标签（或 `存储`）
   - 左侧选择：`Cookies` → `https://linux.do`
   - 方法A：手动复制所有 cookie（格式：`name=value; name=value; ...`）
   - 方法B：在 Console 中运行：`document.cookie`，复制输出

3. **在服务器上更新 Cookie**
   ```bash
   cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
   node update_cookie.js
   # 粘贴刚才复制的 cookie 字符串
   ```

4. **验证 Cookie 是否有效**
   ```bash
   node test_specific_topic_1590573.js
   ```
   
   ✅ 成功：显示帖子标题和内容
   ❌ 失败：显示 403 Forbidden

### 优点
- 立即可用，无需安装软件
- 简单直接

### 缺点
- 需要手动操作
- Cookie 会过期（通常 1-2 周），需要定期更新

---

## 方案2：自动 OAuth 登录（长期方案）🤖

### 步骤：

1. **安装 Chrome 浏览器**
   ```bash
   cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
   bash install_chrome.sh
   ```
   
   这会：
   - 下载 Google Chrome（约 200MB）
   - 安装到 `/usr/bin/google-chrome`
   - 自动配置依赖

2. **运行自动登录**
   ```bash
   node linuxdo_auth.js
   ```
   
   程序会：
   - 启动 Chrome（无头模式，后台运行）
   - 访问 linux.do 登录页
   - 点击 "使用 Google 登录"
   - 自动输入账号密码（从 email_config.json 读取）
   - 获取 Cookie 并保存
   - 关闭 Chrome

3. **验证 Cookie**
   ```bash
   node test_specific_topic_1590573.js
   ```

4. **（可选）设置定期自动刷新**
   ```bash
   # 添加到 crontab，每周自动刷新一次
   crontab -e
   
   # 添加这一行（每周一凌晨 2 点执行）
   0 2 * * 1 cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator && node linuxdo_auth.js >> logs/auth.log 2>&1
   ```

### 优点
- 完全自动化
- 可以定期刷新，永不过期
- 一次配置，长期使用

### 缺点
- 需要安装 Chrome（约 200MB 磁盘空间）
- Google 有反自动化检测，可能需要调试
- 首次配置稍复杂

---

## 工作原理说明

### Ubuntu 服务器上如何使用 Chrome？

**无头模式（Headless Mode）**：
- Chrome 在后台运行，不需要显示器或图形界面
- 完全由 Puppeteer 代码控制
- 就像一个"看不见的浏览器"在自动操作

**流程图**：
```
命令行运行 node linuxdo_auth.js
    ↓
Puppeteer 启动 Chrome（后台）
    ↓
Chrome 访问 linux.do/login
    ↓
点击 "使用 Google 登录"
    ↓
跳转到 Google 登录页
    ↓
自动输入 ibubble@gmail.com
    ↓
自动输入密码
    ↓
登录成功，跳转回 linux.do
    ↓
提取所有 Cookie
    ↓
保存到 linuxdo_cookie.txt
    ↓
关闭 Chrome
    ↓
完成！
```

---

## 推荐方案

**建议先用方案1快速解决，然后配置方案2作为长期方案。**

### 立即执行（方案1）：
```bash
# 在你的 Mac 上获取 cookie，然后在服务器上运行：
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node update_cookie.js
# 粘贴 cookie
node test_specific_topic_1590573.js  # 验证
```

### 长期配置（方案2）：
```bash
# 安装 Chrome
bash install_chrome.sh

# 测试自动登录
node linuxdo_auth.js

# 验证
node test_specific_topic_1590573.js
```

---

## 故障排查

### 方案1 问题
- **Cookie 格式错误**：确保格式为 `name=value; name=value; ...`
- **Cookie 立即失效**：可能是 IP 变化，尝试在服务器上通过代理登录

### 方案2 问题
- **Chrome 安装失败**：检查磁盘空间 `df -h`
- **登录失败**：
  - 检查 `email_config.json` 中的账号密码是否正确
  - 查看截图：`ls -lh logs/*.png`
  - Google 可能检测到自动化，需要手动验证一次
- **2FA 问题**：如果 Gmail 开启了两步验证，需要：
  - 关闭两步验证，或
  - 使用应用专用密码

---

## 相关文件

- `linuxdo_cookie.txt` - 存储的 Cookie
- `email_config.json` - Gmail 账号配置
- `linuxdo_auth.js` - OAuth 自动登录脚本
- `update_cookie.js` - 手动更新 Cookie 工具
- `install_chrome.sh` - Chrome 安装脚本
- `test_specific_topic_1590573.js` - Cookie 验证脚本

---

## 当前配置

Gmail 账号：`ibubble@gmail.com`（已配置在 email_config.json）
