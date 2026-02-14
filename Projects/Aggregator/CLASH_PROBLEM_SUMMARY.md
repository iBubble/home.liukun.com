# Clash代理问题总结

## 问题现象

- ✅ **HTTP网站可以访问**（example.com成功）
- ❌ **HTTPS网站无法访问**（Google、Facebook、linux.do等全部失败）
- ❌ **错误信息**：`OpenSSL SSL_connect: SSL_ERROR_SYSCALL`

## 已验证的事实

1. ✅ 代理服务器连接正常（TCP、TLS、WebSocket握手全部成功）
2. ✅ 节点配置完全正确（与Aggregator.yaml一致）
3. ✅ Clash能建立CONNECT隧道（HTTP/1.1 200 Connection established）
4. ❌ TLS握手失败（Client Hello发送后无响应，5秒超时）

## 根本原因

**TLS握手阶段失败**。Clash成功建立了到代理服务器的连接，也成功建立了CONNECT隧道，但在curl尝试与目标网站进行TLS握手时失败。

可能的原因：
1. **代理节点的TLS转发有问题** - 但宿主机Clash可以用，说明节点本身没问题
2. **虚拟机网络环境问题** - VMware网络配置、防火墙、或网络栈问题
3. **Clash版本/实现差异** - 宿主机可能用的是不同的Clash核心
4. **系统OpenSSL配置** - 虚拟机的OpenSSL配置可能有问题

## 测试结果

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 直接连接代理服务器 | ✅ 成功 | TCP连接正常 |
| WebSocket握手 | ✅ 成功 | TLS和WS协议正常 |
| HTTP网站（example.com） | ✅ 成功 | 代理功能正常 |
| HTTPS网站（Google等） | ❌ 失败 | TLS握手超时 |
| 禁用IPv6 | ❌ 仍失败 | 不是IPv6问题 |
| 禁用TFO | ❌ 仍失败 | 不是TFO问题 |
| 降低MSS | ❌ 仍失败 | 不是MTU问题 |
| SOCKS5代理 | ❌ 仍失败 | 不是协议问题 |

## 建议方案

### 方案1：使用宿主机Clash作为上游代理（已被拒绝）
让虚拟机通过宿主机的Clash访问外网。

### 方案2：使用v2ray-core替代Clash
v2ray-core可能在虚拟机环境下兼容性更好。

### 方案3：排查虚拟机网络配置
检查VMware网络设置、防火墙规则、iptables等。

### 方案4：直接使用已验证的节点
既然HTTP可以访问，说明代理通道是通的。问题可能在于HTTPS的某个特定配置。

## 下一步行动

建议：
1. 检查宿主机Clash的完整配置（如果允许）
2. 尝试使用v2ray-core
3. 检查虚拟机的网络配置和防火墙规则
4. 或者接受HTTP可用的现状，针对性解决HTTPS问题
