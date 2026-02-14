# 通过代理获取 Linux.do Cookie 的最佳方案

## 问题分析

1. ❌ 直接在 Mac 上登录 → Cookie 绑定 Mac 的 IP → 服务器使用时 403
2. ❌ 服务器自动化登录 → Google 反自动化检测 → 登录失败
3. ✅ **在 Mac 上通过服务器代理登录** → Cookie 绑定服务器 IP → 完美！

## 解决方案

### 步骤 1：在 Mac 上配置代理

1. **设置 SSH 隧道**（在 Mac 终端运行）：
   ```bash
   ssh -D 1080 -N gemini@home.liukun.com -p 22
   ```
   
   这会在 Mac 的 `localhost:1080` 创建一个 SOCKS5 代理，流量通过服务器转发。

2. **配置浏览器使用代理**：
   
   **方法 A：使用 Chrome 的代理启动**（推荐）
   ```bash
   # 在 Mac 上运行
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --proxy-server="socks5://localhost:1080" \
     --user-data-dir=/tmp/chrome-proxy-profile
   ```
   
   **方法 B：使用 SwitchyOmega 插件**
   - 安装 SwitchyOmega
   - 新建情景模式：SOCKS5，127.0.0.1:1080
   - 切换到该代理

### 步骤 2：登录并获取 Cookie

1. 在代理浏览器中访问 https://linux.do
2. 使用 Gmail 登录（ibubble@gmail.com）
3. 完成 2FA 验证
4. 登录成功后，按 F12 打开开发者工具
5. 在 Console 中运行：
   ```javascript
   copy(document.cookie)
   ```
6. Cookie 已复制到剪贴板

### 步骤 3：更新服务器上的 Cookie

在服务器上运行：
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node update_cookie.js
# 粘贴刚才复制的 cookie
```

### 步骤 4：验证

```bash
node test_specific_topic_1590573.js
```

应该返回 200 OK 并显示帖子内容。

---

## 为什么这个方案有效？

1. **IP 一致性**：Cookie 是在服务器 IP 下获取的（通过 SSH 隧道）
2. **真实浏览器**：使用真实的 Chrome，没有自动化特征
3. **手动操作**：可以处理任何验证（2FA、验证码等）
4. **简单可靠**：不需要复杂的 Puppeteer 脚本

---

## 快速命令参考

### Mac 上：
```bash
# 1. 建立 SSH 隧道
ssh -D 1080 -N gemini@home.liukun.com -p 22

# 2. 启动代理 Chrome（新终端窗口）
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --proxy-server="socks5://localhost:1080" \
  --user-data-dir=/tmp/chrome-proxy-profile

# 3. 在 Chrome 中登录 linux.do，然后在 Console 运行：
# copy(document.cookie)
```

### 服务器上：
```bash
# 4. 更新 Cookie
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node update_cookie.js
# 粘贴 cookie

# 5. 验证
node test_specific_topic_1590573.js
```

---

## 故障排查

### SSH 隧道连接失败
```bash
# 检查 SSH 连接
ssh gemini@home.liukun.com -p 22

# 如果成功，再加 -D 参数
ssh -D 1080 -N gemini@home.liukun.com -p 22
```

### 浏览器代理不生效
```bash
# 检查代理是否在监听
lsof -i :1080

# 应该看到 ssh 进程
```

### Cookie 仍然 403
- 确保 SSH 隧道在运行
- 确保浏览器确实使用了代理（访问 https://ipinfo.io 检查 IP）
- 重新登录 linux.do

---

## 长期维护

Cookie 通常 1-2 周过期，到时候重复上述步骤即可。

或者，等 Google 的反自动化放松后，再尝试服务器端自动登录。
