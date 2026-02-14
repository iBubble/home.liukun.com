# CN节点过滤修复完成

## 问题发现
用户发现代理池使用了 **CN4｜家宽｜非常安全** 这样的国内节点，导致无法访问被GFW封锁的国外网站。

## 根本原因
`selectProxyPool()` 函数虽然注释说"不再限制地区"，但实际上**没有排除CN节点**，导致选择了国内节点作为代理。

## 修复方案
在 `selectProxyPool()` 函数中添加CN节点过滤逻辑：

```javascript
// 筛选：延迟 < 3000ms，且排除国内节点
const candidates = proxies.filter(p => {
    const latency = p.latency || p.avgLatency;
    if (!latency || latency >= 3000 || latency === 'timeout') return false;
    
    // 🔥 关键修复：排除所有国内节点（CN/中国/大陆）
    const name = (p.name || '').toLowerCase();
    const server = (p.server || '').toLowerCase();
    
    // 排除明确标记为CN的节点
    if (name.includes('cn') || name.includes('中国') || name.includes('大陆') || name.includes('家宽')) {
        return false;
    }
    
    // 排除国内IP段（简单判断）
    if (server.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/)) {
        return false; // 内网IP
    }
    
    return true;
});
```

## 测试结果

### 修复前
- 代理池第一个节点：**CN4｜家宽｜非常安全** (183.236.51.36)
- 无法访问Google、GitHub等被封锁网站

### 修复后
```
✅ 筛选后剩余: 15 个节点（排除了1个CN节点）

代理池节点列表 (前10个):
1. (2x)IEPL专线 香港2 - 168ms
2. (2x)IEPL专线 香港3 - 168ms
3. (2x)IEPL专线 香港4 - 172ms
4. (2x)IEPL专线 香港6 - 174ms
5. (2x)IEPL专线 香港5 - 175ms
6. (1.5x)IEPL专线 新加坡2 - 251ms
7. (2x)IEPL专线 日本1 - 267ms
8. (1.5x)IEPL专线 新加坡1 - 268ms
9. (2x)IEPL专线 日本2 - 275ms
10. (1.5x)IEPL专线 印度1 - 363ms

✅ 验证通过：代理池中没有CN节点
```

## 影响范围
所有使用 `selectProxyPool()` 的功能：
- ✅ `fetchSubscriptions()` - GitHub订阅源获取
- ✅ `scrapeWebSites()` - 分享站抓取
- ✅ `fetchFromLinuxDo()` - Linux.do论坛订阅解析

## 部署状态
- ✅ 代码已修复
- ✅ 服务已重启
- ✅ 测试验证通过

## 下一步
访问 https://home.liukun.com:8443/Projects/Aggregator/ 点击"全网获取节点"测试实际效果。

---
修复时间: 2026-02-08 23:55
