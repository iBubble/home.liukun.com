# 智能代理系统实现文档

## 概述

为了解决从国内服务器访问 GitHub、linux.do 等外网资源被拦截的问题，实现了一个智能代理系统，该系统能够：

1. 自动从已有节点中选择最快的代理
2. 建立代理池，支持自动切换备用代理
3. 在抓取节点过程中自动使用代理
4. 支持重试机制，提高成功率

## 核心功能

### 1. 代理池管理

#### 选择代理池 (`selectProxyPool`)
- 从 `proxies.json` 中筛选符合条件的节点
- 筛选条件：
  - 地区：美国、台湾、日本、香港、新加坡
  - 延迟：< 800ms
- 按延迟排序，选择前5个最快的节点作为代理池
- 返回代理池数组

```javascript
globalProxyPool = await selectProxyPool();
// 返回: [proxy1, proxy2, proxy3, proxy4, proxy5]
```

### 2. 代理启动与切换

#### 启动代理 (`startFetchProxy`)
- 使用代理池中指定索引的节点
- 生成独立的 Clash 配置文件
- 启动独立的 Clash 进程（端口 7891）
- 返回代理URL：`http://127.0.0.1:7891`

#### 切换代理 (`switchToNextProxy`)
- 当前代理失败时自动切换到下一个
- 停止旧代理进程
- 启动新代理进程
- 更新当前代理索引

### 3. 带重试的请求函数

#### fetchWithProxy
通用的代理请求函数，支持：
- 自动使用当前代理
- 失败时自动切换代理重试
- 最多重试3次
- 所有重试失败后尝试直连

**参数**：
```javascript
{
    cookie: '',           // Cookie字符串
    maxRetries: 3,        // 最大重试次数
    timeout: 30,          // 超时时间（秒）
    headers: {}           // 自定义headers
}
```

**使用示例**：
```javascript
const data = await fetchWithProxy('https://github.com/...', {
    maxRetries: 3,
    timeout: 30
});
```

### 4. Linux.do 专用函数

#### fetchLinuxDo
封装了 `fetchWithProxy`，专门用于访问 linux.do：
```javascript
const data = await fetchLinuxDo(url, cookie);
```

## 工作流程

### 抓取节点时的代理流程

```
1. 开始聚合任务
   ↓
2. 初始化代理池 (selectProxyPool)
   ↓
3. 启动第一个代理 (startFetchProxy(0))
   ↓
4. 执行抓取任务
   ├─ GitHub 订阅
   ├─ 网站抓取
   └─ Linux.do 论坛
   ↓
5. 请求失败时自动切换代理
   ├─ 尝试代理2
   ├─ 尝试代理3
   ├─ ...
   └─ 最后尝试直连
   ↓
6. 任务完成，停止代理 (stopFetchProxy)
```

### 重试机制

```
请求URL
  ↓
使用代理1 → 失败
  ↓
切换到代理2 → 失败
  ↓
切换到代理3 → 失败
  ↓
尝试直连 → 成功/失败
```

## 代理池状态

### 全局变量
```javascript
let globalProxyPool = [];      // 代理池数组
let currentProxyIndex = 0;     // 当前使用的代理索引
let fetchProxyClashProcess = null;  // Clash进程
const FETCH_PROXY_PORT = 7891; // 代理端口
```

### 代理池示例
```javascript
[
  { name: "US 25ms", latency: 25, server: "1.2.3.4", ... },
  { name: "HK 45ms", latency: 45, server: "5.6.7.8", ... },
  { name: "JP 60ms", latency: 60, server: "9.10.11.12", ... },
  { name: "TW 80ms", latency: 80, server: "13.14.15.16", ... },
  { name: "SG 120ms", latency: 120, server: "17.18.19.20", ... }
]
```

## 集成点

### 1. runAggregation 函数
在聚合任务开始时初始化代理：
```javascript
async function runAggregation(mode = 'github', pages = 50) {
    // 初始化代理池
    globalProxyPool = await selectProxyPool();
    let proxyUrl = null;
    
    if (globalProxyPool.length > 0) {
        proxyUrl = await startFetchProxy(0);
    }
    
    try {
        // 执行抓取任务...
    } finally {
        stopFetchProxy(); // 清理代理
    }
}
```

### 2. fetchLinuxDo 调用
所有访问 linux.do 的地方自动使用代理：
```javascript
const listJson = await fetchLinuxDo(pageUrl, cookie);
const topicJson = await fetchLinuxDo(topicUrl, cookie);
```

### 3. 进程退出处理
确保进程退出时清理代理：
```javascript
process.on('SIGINT', () => {
    stopClash();
    stopFetchProxy(); // 停止代理
    process.exit(0);
});
```

## 优势

1. **自动化**：无需手动配置代理，自动从已有节点中选择
2. **高可用**：代理池 + 自动切换，提高成功率
3. **智能重试**：失败自动切换代理，最多尝试5个节点
4. **隔离性**：使用独立端口，不影响其他功能
5. **容错性**：所有代理失败后自动降级到直连

## 日志示例

```
✅ 代理池已准备: 5 个节点 (最快: US 25ms, 25ms)
🚀 启动抓取代理 [1/5]: US 25ms (25ms)
✅ 代理已启动: US 25ms
🌐 启动代理系统 (代理池: 5 个节点)...
✅ 代理系统已就绪，所有外网请求将通过代理

... 抓取过程 ...

请求失败 (尝试 1/3): Connection timeout
🔄 切换到备用代理 [2/5]...
🚀 启动抓取代理 [2/5]: HK 45ms (45ms)
✅ 代理已启动: HK 45ms

... 继续抓取 ...

🛑 抓取代理已停止
```

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 代理池大小 | 5 | 选择前5个最快的节点 |
| 延迟阈值 | 800ms | 只选择延迟 < 800ms 的节点 |
| 代理端口 | 7891 | Clash 代理端口 |
| 最大重试次数 | 3 | 每个请求最多重试3次 |
| 请求超时 | 30秒 | 单次请求超时时间 |

## 注意事项

1. **首次运行**：需要先有可用节点才能使用代理（建议先直连获取一批节点）
2. **端口冲突**：确保 7891 端口未被占用
3. **Clash 二进制**：确保 `CLASH_BIN` 路径正确
4. **代理质量**：代理池质量取决于已有节点的质量

## 未来改进

1. 支持更多代理协议（SOCKS5、HTTP）
2. 代理健康检查和自动剔除
3. 代理使用统计和优化
4. 支持自定义代理池配置
5. 代理池持久化和缓存

## 相关文件

- `Projects/Aggregator/app.js` - 主要实现
  - `selectProxyPool()` - 第506行
  - `startFetchProxy()` - 第540行
  - `switchToNextProxy()` - 第590行
  - `stopFetchProxy()` - 第600行
  - `fetchWithProxy()` - 第615行
  - `fetchLinuxDo()` - 第710行
  - `runAggregation()` - 第1862行（集成点）
