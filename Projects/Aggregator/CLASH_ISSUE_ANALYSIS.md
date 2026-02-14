# Clash代理问题分析

## 问题现象

- ✅ **Mac上Clash客户端** + AT_speednode_0003：成功访问linux.do、Google、Facebook、Youtube
- ❌ **Linux服务器脚本** + AT_speednode_0003：失败（i/o timeout）

## 已验证的事实

1. ✅ 代理服务器连通性正常
   - TCP连接：成功
   - TLS握手：成功  
   - WebSocket升级：成功

2. ✅ 配置完全一致
   - 使用了与Aggregator.yaml完全相同的配置
   - 包含所有关键参数：tfo, skip-cert-verify, udp, ws-opts

3. ❌ 通过代理访问目标网站失败
   - 错误：`dial tcp xxx:443: i/o timeout`
   - 尝试了IPv4和IPv6都失败
   - 添加DNS配置也失败

## 根本原因分析

**网络环境差异**：
- Mac电脑和Linux服务器的**网络出口不同**
- 代理节点可能对不同的源IP有不同的限制
- 或者运营商/防火墙对Linux服务器的出站连接有限制

## 解决方案

### 方案1：使用Mac作为中转代理（推荐）

既然Mac上的Clash客户端可以正常工作，让Linux服务器通过Mac的Clash作为代理：

```javascript
// 在Linux服务器上配置
const PROXY_URL = 'http://[Mac的IP]:7890'; // Mac上Clash的HTTP代理端口

// 所有请求通过Mac的Clash
const response = await fetch(url, {
    agent: new HttpsProxyAgent(PROXY_URL)
});
```

**优点**：
- 利用已经工作的Mac Clash客户端
- 无需在Linux上调试Clash配置
- 立即可用

**缺点**：
- 需要Mac保持在线
- 增加一跳网络延迟

### 方案2：排查Linux服务器网络限制

检查Linux服务器是否有出站限制：
1. 防火墙规则
2. iptables配置
3. 运营商限制
4. 代理节点的IP白名单

### 方案3：使用不同的代理节点

测试其他代理节点，看是否是特定节点的问题。

## 下一步行动

**建议采用方案1**：

1. 在Mac上确认Clash客户端的HTTP代理端口（通常是7890）
2. 确保Mac的Clash允许局域网连接（allow-lan: true）
3. 获取Mac的局域网IP地址
4. 修改Linux服务器代码，使用Mac的Clash作为上游代理

这样可以立即解决问题，让Linux.do导入功能正常工作。
