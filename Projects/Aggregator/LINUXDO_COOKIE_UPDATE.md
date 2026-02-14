# Linux.do Cookie 更新指南

## 问题现状

- ✓ 付费节点代理已配置并保持运行
- ✓ 代理访问功能正常（HTTP CONNECT 隧道）
- ✗ Cookie 已过期（1月31日），被 Cloudflare 拦截（403 Forbidden）

## 解决方案

### 方案1：手动更新 Cookie（推荐，最快）

1. 在浏览器中访问 https://linux.do
2. 登录你的账号
3. 打开开发者工具（F12）
4. 切换到 Application（应用）标签
5. 左侧选择 Cookies → https://linux.do
6. 找到 `_t` 这个 Cookie
7. 复制它的值（完整的字符串）
8. 更新服务器上的文件：

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
echo "你复制的_t值" > linuxdo_cookie.txt
chmod 664 linuxdo_cookie.txt
```

9. 测试访问：

```bash
node test_linuxdo_with_premium_now.js
```

### 方案2：安装 Chrome 浏览器（用于自动登录）

```bash
# 下载 Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb

# 安装
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f

# 运行自动登录脚本
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node linuxdo_auth.js
```

## 代理状态

当前付费节点代理配置：
- 端口：7940
- 节点数：103个（包含专线节点）
- 状态：持续运行（不会在任务结束后停止）

检查代理状态：
```bash
ps aux | grep clash | grep 7940
```

## 测试命令

```bash
# 测试付费节点代理访问 Linux.do
node test_linuxdo_with_premium_now.js

# 触发 Linux.do 导入任务
node quick_test_linuxdo.js

# 查看日志
pm2 logs aggregator --lines 50
```

## 已修复的问题

1. ✓ 付费节点代理不再在任务结束后停止
2. ✓ 使用 HTTP CONNECT 隧道方式访问（正确的代理方式）
3. ✓ 代理池和付费节点代理可以共存

## 下一步

更新 Cookie 后，Linux.do 导入功能应该可以正常工作。
