# 外网HTTPS访问问题解决方案

## 问题诊断结果

### 现状
- ✅ 内网访问 https://home.liukun.com 正常
- ❌ 外网访问 https://home.liukun.com 失败（ERR_CONNECTION_CLOSED）
- ✅ 服务器443端口正常监听
- ✅ 防火墙443端口已开放
- ✅ SSL证书配置正确

### 根本原因
域名 `home.liukun.com` → CNAME → `ibubble.vicp.net`（花生壳动态域名）

**花生壳的端口映射可能只配置了80端口，没有配置443端口**

## 解决方案

### 方案1：配置花生壳443端口映射（推荐）

1. 登录花生壳管理后台
2. 找到 `ibubble.vicp.net` 的映射配置
3. 添加443端口映射：
   - 外网端口：443
   - 内网主机：192.168.1.40
   - 内网端口：443
   - 协议：TCP

### 方案2：使用非标准HTTPS端口

如果花生壳不支持443端口映射，可以使用其他端口（如8443）：

1. 修改Nginx配置，添加8443端口监听
2. 在花生壳配置8443端口映射
3. 访问时使用：https://home.liukun.com:8443

### 方案3：使用Cloudflare等CDN服务

1. 将域名DNS改为Cloudflare
2. 启用Cloudflare的SSL/TLS功能
3. Cloudflare会处理443端口，并转发到你的源服务器

### 方案4：升级花生壳服务

部分花生壳免费版本不支持443端口映射，可能需要升级到付费版本。

## 验证步骤

配置完成后，从外网测试：

```bash
# 测试80端口
curl -I http://home.liukun.com

# 测试443端口
curl -I https://home.liukun.com

# 或使用在线工具
# https://www.yougetsignal.com/tools/open-ports/
```

## 当前配置检查清单

- [x] 服务器443端口监听正常
- [x] 防火墙443端口开放
- [x] 路由器443端口转发配置
- [ ] 花生壳443端口映射配置 ← **需要检查这一项**
- [x] SSL证书配置正确
- [x] Nginx server_name包含home.liukun.com
