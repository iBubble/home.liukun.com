# Cloudflare 快速配置步骤

## 好消息！
测试显示你的443端口对服务器之间的连接是开放的，只是普通用户被运营商屏蔽。这意味着Cloudflare可以直接访问你的443端口，配置非常简单！

## 配置步骤

### 步骤1：注册Cloudflare账号
1. 访问：https://dash.cloudflare.com/sign-up
2. 使用邮箱注册（免费）
3. 验证邮箱

### 步骤2：添加域名
1. 登录后点击 "Add a Site"
2. 输入：`liukun.com`（你的根域名）
3. 选择 "Free" 免费计划
4. 点击 "Continue"

### 步骤3：配置DNS记录
Cloudflare会扫描现有DNS记录，确保有以下记录：

**方式A：如果使用花生壳动态域名**
```
Type: CNAME
Name: home
Target: ibubble.vicp.net
Proxy status: 橙色云朵（Proxied）✓
TTL: Auto
```

**方式B：如果直接使用IP**
```
Type: A
Name: home
IPv4 address: 202.98.183.32
Proxy status: 橙色云朵（Proxied）✓
TTL: Auto
```

**重要：** 必须开启橙色云朵（Proxied），这样流量才会通过Cloudflare。

### 步骤4：更改域名DNS服务器
Cloudflare会显示两个DNS服务器地址，例如：
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**操作：**
1. 登录你购买 `liukun.com` 域名的网站（域名注册商）
2. 找到域名管理 → DNS设置
3. 将DNS服务器改为Cloudflare提供的地址
4. 保存

**等待时间：** 5-30分钟（最长48小时）

### 步骤5：配置SSL/TLS
1. 在Cloudflare控制台，选择你的站点
2. 点击左侧 "SSL/TLS"
3. 加密模式选择：**Full (strict)**
4. 开启以下选项：
   - ✓ Always Use HTTPS
   - ✓ Automatic HTTPS Rewrites

### 步骤6：验证配置
1. 等待DNS生效（通常5-30分钟）
2. 访问：https://home.liukun.com （不需要端口号！）
3. 应该能正常访问

## 工作原理

```
用户浏览器 
  ↓ (HTTPS 443端口)
Cloudflare服务器
  ↓ (HTTPS 443端口)
你的服务器 (202.98.183.32:443)
```

- 用户访问Cloudflare的443端口（不被屏蔽）
- Cloudflare访问你的443端口（服务器间连接，不被屏蔽）
- 完美解决运营商屏蔽问题！

## 额外优势

使用Cloudflare后，你还能获得：
- ✓ 全球CDN加速
- ✓ DDoS防护
- ✓ 自动HTTPS
- ✓ 缓存加速
- ✓ 流量分析
- ✓ 完全免费！

## 常见问题

### Q: 我的域名注册商是哪里？
A: 查看你购买 `liukun.com` 的网站，常见的有：
- 阿里云（万网）
- 腾讯云
- GoDaddy
- Namecheap
- 等等

### Q: DNS更改后多久生效？
A: 通常5-30分钟，可以用以下命令检查：
```bash
nslookup home.liukun.com
```
如果返回的是Cloudflare的IP地址，说明已生效。

### Q: 配置完成后还需要8443端口吗？
A: 不需要了！用户直接访问标准的443端口即可。但建议保留8443作为备用。

## 下一步

1. 按照上述步骤配置Cloudflare
2. 配置过程中如有问题，随时告诉我
3. 配置完成后，我会帮你优化性能设置
