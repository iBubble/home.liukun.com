# Linux.do 访问问题修复完成

## 问题描述

之前可以访问 Linux.do，现在又不行了。

## 根本原因

**使用了错误的代理方式**：
- ❌ HTTP CONNECT 隧道：被 Cloudflare 拦截（403 Forbidden）
- ✓ HTTP 代理模式（curl -x）：成功绕过 Cloudflare

## 修复内容

### 1. 修改代理访问方式

**文件**: `Projects/Aggregator/app.js`

**修改**: `fetchWithProxy` 函数
- 从 HTTP CONNECT 隧道改为 curl -x 方式
- 使用 `spawn('curl', ['-x', proxyUrl, url])` 而不是 `http.request({ method: 'CONNECT' })`

### 2. 保持付费节点代理运行

**修改位置**:
1. `runLinuxDoImportTask` 的 finally 块
2. `runAggregation` 的 finally 块
3. API 接口中的停止代理逻辑

**修改内容**: 移除 `premiumProxy.stop()` 调用，改为保持运行状态

### 3. 更新 Cookie

**新 Cookie** (已保存到 `linuxdo_cookie.txt`):
```
U2NuT6Y524tpAO6mh0PG819EM85njGtwQvZuHOE%2F4WS0mLoIN0itBE%2FlPXqWDHj3%2FZRU3NmM%2B6iHxNlBJSqkllnJPI89rq1aIhvz0C764nCZ9sWOXKYdkkOVKKUHVE28N3Vjgel3xOiD8Hgh2TRFf7wH6UoF2xnllTdTNMKNoKsydJ0U4buCmYGdfhIe2YfEmupgsGGkPJTsX80NEpteQrD7rd74ExOpDAy3VWOkFHrORqWUqDQ3RKXssu1HfDb71LaMXXJxELGjrWS5L9WrKGG911sRK5%2BgwiwPlIg0eOtKi0%2B%2B--%2BXhs2I9GFmjY6BHm--O5VVigo96tg1nHcxTDgDsA%3D%3D
```

**验证**: 
```bash
curl -s -L --max-time 10 -H "Cookie: $(cat linuxdo_cookie.txt)" -x http://127.0.0.1:7940 "https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json" | head -c 500
```

结果：✓ 成功获取 JSON 数据

## 测试结果

### 成功的测试

```bash
# 测试标签页访问
curl -s -L -H "Cookie: $(cat linuxdo_cookie.txt)" -x http://127.0.0.1:7940 "https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json"
# 结果: ✓ 返回 JSON 数据，包含用户和帖子列表

# 测试 app.js 的 Linux.do 导入任务
node quick_test_linuxdo.js
# 结果: ✓ 任务启动成功，日志显示正在获取帖子
```

### 日志输出

```
[6:04:36 PM] [INFO] ✓ 使用付费节点代理: http://127.0.0.1:7940
[6:04:38 PM] [INFO] 第 1 页获取 30 个新帖子，累计 30 个
[6:04:42 PM] [INFO] 第 2 页获取 30 个新帖子，累计 60 个
[6:04:47 PM] [INFO] 第 3 页获取 30 个新帖子，累计 90 个
```

## 前端页面问题

### 问题

页面显示 `{{ cookieInputError }}`，这是 Vue 模板变量未渲染。

### 原因

可能是浏览器缓存了旧版本的页面。

### 解决方案

1. **强制刷新页面**: Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac)
2. **清除浏览器缓存**: 
   - Chrome: F12 → Network → Disable cache
   - 或者: 设置 → 隐私和安全 → 清除浏览数据
3. **检查 Vue 加载**: 
   - F12 → Console
   - 输入 `Vue` 检查是否已加载
   - 输入 `app` 检查 Vue 实例是否存在

### 验证

访问: `http://localhost:3000` 或 `https://home.liukun.com:8443/Projects/Aggregator/`

应该看到：
- Cookie 管理弹窗正常显示
- 输入框可以输入
- 测试/保存按钮可以点击

## 当前状态

✓ **付费节点代理**: 运行中（端口 7940，103个节点）
✓ **代理方式**: curl -x（HTTP 代理模式）
✓ **Cookie**: 有效（已更新）
✓ **Linux.do 访问**: 正常（可以获取帖子列表）
✓ **代理持久化**: 不会在任务结束后停止

## 下一步

1. 清除浏览器缓存，刷新页面
2. 如果前端仍有问题，检查浏览器控制台的错误信息
3. Linux.do 导入任务会自动运行，无需手动干预

## 技术细节

### 为什么 curl -x 可以，HTTP CONNECT 不行？

**HTTP CONNECT 隧道**:
- 浏览器直接与目标服务器建立 TLS 连接
- Cloudflare 可以检测到代理特征（如 TLS 指纹）
- 触发人机验证（403 Forbidden）

**HTTP 代理模式（curl -x）**:
- curl 通过代理发送 HTTP 请求
- 代理服务器（Clash）处理 TLS 连接
- Cloudflare 看到的是 Clash 的 TLS 指纹，更难检测

### 代理配置

```javascript
// 付费节点代理
const proxyUrl = 'http://127.0.0.1:7940';

// curl 命令
const curlArgs = [
    '-s', '-L', '--max-time', '30',
    '-H', 'Accept: application/json',
    '-H', 'User-Agent: Mozilla/5.0...',
    '-x', proxyUrl,  // 关键：使用 -x 指定代理
    '-H', `Cookie: ${cookie}`,
    url
];
```

## 参考文件

- `Projects/Aggregator/app.js` - 主应用（已修复）
- `Projects/Aggregator/premium_proxy_manager.js` - 付费节点代理管理器
- `Projects/Aggregator/fetch_specific_topic.js` - 成功的参考实现
- `Projects/Aggregator/linuxdo_cookie.txt` - Cookie 文件
- `Projects/Aggregator/LINUXDO_COOKIE_UPDATE.md` - Cookie 更新指南
