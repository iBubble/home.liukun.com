# Linux.do 节点获取功能总结

## 完成的工作

### 1. 创建的脚本

#### test_linuxdo_with_premium.js
- **功能**: 使用付费订阅节点作为代理访问 Linux.do
- **特点**:
  - 使用付费订阅的优先节点(美国02、台湾02、日本02)
  - 通过 Cookie 认证访问 Linux.do
  - 获取"订阅节点"标签下的主题列表
  - 提取主题中的节点链接和订阅链接
- **测试结果**: ✅ 成功访问并获取到订阅链接

#### fetch_linuxdo_subscriptions.js
- **功能**: 完整的订阅获取和下载流程
- **特点**:
  - 自动获取 Linux.do 主题列表
  - 提取订阅链接
  - 下载并解析订阅内容
  - 支持多种格式: Clash YAML, Base64, 纯文本
  - 保存结果到 JSON 文件
- **测试结果**: ✅ 成功获取订阅链接,但部分订阅已失效

## 测试结果

### 成功访问 Linux.do
```
✓ 使用付费节点成功访问 Linux.do
✓ Cookie 认证成功
✓ 获取到 30 个主题
✓ 找到 13 个订阅链接
```

### 发现的订阅链接
从 Linux.do 获取到的订阅链接:
1. `https://zhuzhuzhu.whtjdasha.com/api/v1/client/subscribe?token=...` (超时)
2. `https://sni.jpmj.dev/sub` (16字节,可能失效)
3. `https://sni.111000.indevs.in/sub` (16字节,可能失效)
4. 其他多个 sni.111000.* 域名的订阅 (都返回16字节)

### 问题分析
1. **部分订阅已失效**: 返回16字节的数据,可能是错误信息
2. **需要特殊请求头**: 某些订阅可能需要特定的 User-Agent 或其他请求头
3. **订阅有效期**: Linux.do 上分享的免费订阅通常有效期较短
4. **Cookie 和 IP 绑定**: 可能需要从特定 IP 访问

## 使用方法

### 1. 测试访问 Linux.do
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node test_linuxdo_with_premium.js
```

### 2. 获取并下载订阅
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node fetch_linuxdo_subscriptions.js
```

### 3. 查看结果
```bash
cat linuxdo_subscriptions.json
```

## 技术实现

### 代理链路
```
本地脚本 → Clash (付费节点) → Linux.do
```

### 关键技术点
1. **Clash 代理**: 使用付费订阅的优先节点
2. **Cookie 认证**: 读取 `linuxdo_cookie.txt` 文件
3. **curl 代理**: 通过 `-x` 参数使用 HTTP 代理
4. **多格式解析**: 支持 YAML, Base64, 纯文本格式

### 代码结构
```javascript
// 1. 加载付费节点
const nodes = loadPremiumNodes();

// 2. 启动 Clash 代理
createClashConfig(nodes);
await startClash();

// 3. 通过代理访问 Linux.do
const data = await curlWithProxy(url, cookie);

// 4. 解析订阅内容
const result = await downloadSubscription(subUrl, cookie);
```

## 优化建议

### 1. 增加订阅格式支持
- Shadowrocket 格式
- Quantumult X 格式
- Surge 格式

### 2. 增加重试机制
- 订阅下载失败时自动重试
- 切换不同的代理节点重试

### 3. 订阅有效性检测
- 下载后立即测试节点可用性
- 过滤掉无效的订阅

### 4. 定时任务
- 每天自动获取最新订阅
- 与付费订阅更新任务配合

## 相关文件

- `test_linuxdo_with_premium.js` - 测试脚本
- `fetch_linuxdo_subscriptions.js` - 完整获取脚本
- `linuxdo_cookie.txt` - Cookie 文件
- `premium_nodes.json` - 付费节点数据
- `linuxdo_subscriptions.json` - 获取结果

## 注意事项

1. **Cookie 有效期**: Cookie 可能会过期,需要定期更新
2. **IP 限制**: 某些订阅可能限制访问 IP
3. **流量限制**: 免费订阅通常有流量限制
4. **法律合规**: 仅用于学习和开发目的

## 下一步计划

1. ✅ 实现付费订阅自动更新
2. ✅ 实现通过付费节点访问 Linux.do
3. ✅ 实现订阅链接提取
4. ⏳ 实现订阅有效性验证
5. ⏳ 实现定时自动获取
6. ⏳ 整合到主系统

## 更新历史

- **2026-02-10**: 初始版本
  - 实现付费节点代理访问
  - 实现 Linux.do 订阅获取
  - 支持多种订阅格式解析
  - 测试成功访问 Linux.do
