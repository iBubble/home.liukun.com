# 代理使用情况分析报告

## 检查时间
2026-02-08

## 问题发现

### ❌ 未使用代理的国外来源

1. **fetchSubscriptions() 函数** (行990-1030)
   - 用途：获取 Github 订阅源
   - 当前状态：**使用 fetchUrl() - 直连，无代理**
   - 影响：
     - `qybndbviblvt.us-west-1.clawcloudrun.com` (wzdnzd/aggregator API) - 被GFW拦截
     - Github raw 内容（虽然用了镜像，但镜像也可能不稳定）

2. **scrapeWebSites() 函数** (行1686-1730)
   - 用途：深度挖掘分享站
   - 当前状态：**使用 fetchUrl() - 直连，无代理**
   - 影响：
     - `nodefree.org` - 被GFW拦截
     - `clashnode.com` - 被GFW拦截
     - `freeclashnode.com` - 被GFW拦截
     - `v2rayshare.com` - 被GFW拦截

3. **fetchFromLinuxDo() 内的订阅解析** (行1897)
   - 用途：解析论坛帖子中的订阅链接
   - 当前状态：**使用 fetchUrl() - 直连，无代理**
   - 影响：如果订阅链接是国外地址，会失败

### ✅ 已正确使用代理的部分

1. **fetchLinuxDo() 函数** (行790)
   - 用途：访问 Linux.do 论坛
   - 当前状态：**使用 fetchWithProxy() - 有代理**
   - 状态：✅ 正确

## 修复方案

需要将以下函数中的 `fetchUrl()` 替换为 `fetchWithProxy()`：

### 1. fetchSubscriptions() 函数
```javascript
// 修改前 (行1004)
const content = await fetchUrl(url, 15000);

// 修改后
const content = await fetchWithProxy(url, {
    maxRetries: 2,
    timeout: 15
});
```

### 2. scrapeWebSites() 函数
```javascript
// 修改前 (行1704, 1721)
const html = await fetchUrl(site, 8000);
const pageHtml = await fetchUrl(url, 8000);

// 修改后
const html = await fetchWithProxy(site, {
    maxRetries: 2,
    timeout: 8
});
const pageHtml = await fetchWithProxy(url, {
    maxRetries: 2,
    timeout: 8
});
```

### 3. fetchFromLinuxDo() 内的订阅解析
```javascript
// 修改前 (行1897)
const subContent = await fetchUrl(url, 15000);

// 修改后
const subContent = await fetchWithProxy(url, {
    maxRetries: 2,
    timeout: 15
});
```

## 优先级

🔴 **高优先级**：
- fetchSubscriptions() - 影响主要的 Github 节点获取
- scrapeWebSites() - 影响分享站节点获取

🟡 **中优先级**：
- fetchFromLinuxDo() 内的订阅解析 - 影响论坛订阅链接解析

## 预期效果

修复后：
- ✅ 所有国外来源都通过代理访问
- ✅ 避免 GFW 拦截导致的获取失败
- ✅ 提高节点获取成功率
- ✅ 代理失败时自动切换备用代理或直连

## 注意事项

1. fetchWithProxy() 已经内置了重试机制和代理切换逻辑
2. 如果所有代理都失败，会自动切换到直连模式
3. 国内镜像源（ghproxy.com, jsdelivr）可以继续使用直连，但建议也加代理以提高稳定性
