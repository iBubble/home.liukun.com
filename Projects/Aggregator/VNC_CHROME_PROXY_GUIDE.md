# VNC中使用Chrome通过代理访问linux.do获取Cookie指南

## 当前状态
- ✅ VNC服务器运行在 5901 端口
- ✅ 已通过macOS屏幕共享连接
- ✅ Google Chrome已安装
- ✅ Clash代理运行在 127.0.0.1:7940

## 方法1：使用命令行启动Chrome（推荐）

### 在VNC终端中执行：

```bash
# 设置代理环境变量并启动Chrome
export http_proxy="socks5://127.0.0.1:7940"
export https_proxy="socks5://127.0.0.1:7940"
google-chrome --proxy-server="socks5://127.0.0.1:7940" https://linux.do &
```

或者使用已创建的脚本：
```bash
bash ~/start_chrome_with_proxy.sh
```

## 方法2：在Chrome中手动设置代理

### 步骤：

1. **启动Chrome**（不带代理）
   ```bash
   google-chrome &
   ```

2. **打开Chrome设置**
   - 点击右上角三个点 → Settings（设置）
   - 或直接访问：`chrome://settings/`

3. **进入代理设置**
   - 在设置页面搜索框输入：`proxy`
   - 点击 "Open your computer's proxy settings"（打开计算机的代理设置）
   - 或者在左侧菜单找到 "System" → "Open your computer's proxy settings"

4. **配置系统代理**
   - 在弹出的系统设置中：
   - Method: Manual（手动）
   - SOCKS Host: `127.0.0.1`
   - Port: `7940`
   - 勾选 "Use this proxy server for all protocols"

5. **应用设置**
   - 点击 Apply 或 OK
   - 重启Chrome

## 方法3：使用Chrome扩展（备选）

如果上述方法不行，可以安装代理扩展：
- SwitchyOmega
- Proxy SwitchySharp

## 获取Cookie的步骤

### 1. 访问linux.do
在Chrome地址栏输入：`https://linux.do`

### 2. 登录账号
- 点击右上角 "登录"
- 选择 "使用Google登录"
- 邮箱：`ibubble@gmail.com`
- 密码：`Gl5181081@gmail`
- 输入2FA验证码（Google Authenticator）

### 3. 获取Cookie
登录成功后：
- 按 `F12` 打开开发者工具
- 切换到 `Console` 标签
- 输入并回车：
  ```javascript
  copy(document.cookie)
  ```
- Cookie已复制到剪贴板

### 4. 更新Cookie到服务器
在SSH终端中：
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node update_cookie.js
# 粘贴刚才复制的Cookie
```

### 5. 验证Cookie
```bash
node test_specific_topic_1590573.js
```

如果看到 "✅ Cookie 完全有效"，说明成功！

## 故障排除

### Chrome无法启动
```bash
# 检查Chrome是否安装
which google-chrome

# 查看Chrome版本
google-chrome --version

# 如果启动失败，查看错误
google-chrome --no-sandbox --disable-gpu 2>&1 | head -20
```

### 代理无法连接
```bash
# 检查Clash是否运行
netstat -tlnp | grep 7940

# 测试代理连接
curl -x socks5://127.0.0.1:7940 https://www.google.com -I
```

### VNC剪贴板不工作
VNC的剪贴板共享可能有问题，可以：
1. 在VNC中打开文本编辑器（gedit）
2. 在Chrome Console中运行 `copy(document.cookie)`
3. 在文本编辑器中粘贴（Ctrl+V）
4. 保存为文件：`~/cookie.txt`
5. 在SSH中读取：`cat ~/cookie.txt`

## 快捷命令

```bash
# 一键启动Chrome with proxy
bash ~/start_chrome_with_proxy.sh

# 查看当前Cookie
cat ~/Projects/Aggregator/linuxdo_cookie.txt

# 测试Cookie有效性
cd ~/Projects/Aggregator && node test_specific_topic_1590573.js
```
