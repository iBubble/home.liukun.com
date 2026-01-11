# Cloudflare CDN 配置指南

## 目标
让外网用户通过标准443端口访问 https://home.liukun.com，Cloudflare自动转发到服务器的8443端口。

## 第一步：注册Cloudflare账号

1. 访问 https://www.cloudflare.com/
2. 点击 "Sign Up" 注册账号（免费）
3. 验证邮箱

## 第二步：添加域名到Cloudflare

### 2.1 添加站点
1. 登录Cloudflare后，点击 "Add a Site"
2. 输入你的根域名：`liukun.com`（注意：不是home.liukun.com）
3. 选择 "Free" 计划
4. 点击 "Continue"

### 2.2 DNS记录扫描
Cloudflare会自动扫描现有的DNS记录，等待扫描完成。

### 2.3 配置DNS记录
确保有以下DNS记录（如果没有就手动添加）：

**A记录（或CNAME）：**
- Type: `A` 或 `CNAME`
- Name: `home`
- Content: `202.98.183.32`（你的公网IP）或 `ibubble.vicp.net`
- Proxy status: **开启**（橙色云朵图标）
- TTL: Auto

**重要：** 确保 Proxy status 是**橙色云朵**（已代理），不是灰色云朵。

### 2.4 更改域名服务器
Cloudflare会给你两个域名服务器地址，类似：
```
ns1.cloudflare.com
ns2.cloudflare.com
```

你需要到你的域名注册商（购买liukun.com的地方）修改DNS服务器：
1. 登录域名注册商网站
2. 找到 `liukun.com` 的DNS设置
3. 将DNS服务器改为Cloudflare提供的地址
4. 保存修改

**注意：** DNS更改可能需要几分钟到48小时生效。

## 第三步：配置SSL/TLS设置

1. 在Cloudflare控制台，点击你的站点
2. 进入 "SSL/TLS" 菜单
3. 选择加密模式：**Full (strict)** 或 **Full**
   - Full (strict): 需要服务器有有效的SSL证书（推荐）
   - Full: 接受自签名证书

4. 开启以下选项：
   - Always Use HTTPS: **开启**
   - Automatic HTTPS Rewrites: **开启**

## 第四步：配置源服务器端口（关键步骤）

由于你的服务器使用8443端口，需要配置Cloudflare转发到正确的端口。

### 方法1：使用Cloudflare Spectrum（企业版功能，免费版不支持）

### 方法2：使用Cloudflare Workers（免费版可用）

在 "Workers & Pages" 中创建一个Worker来转发请求。

### 方法3：修改服务器配置（推荐，最简单）

**让服务器同时监听443和8443端口：**
- 443端口：供Cloudflare访问（内网可达）
- 8443端口：备用端口

由于运营商只屏蔽外网到443的连接，但Cloudflare到你服务器的443端口是可以连接的（因为是从Cloudflare的服务器发起，不是从普通用户）。

**实际上，你应该测试一下Cloudflare能否访问你的443端口。**

## 第五步：验证配置

1. 等待DNS生效（通常5-30分钟）
2. 访问 https://home.liukun.com （不需要端口号）
3. 检查是否能正常访问

## 第六步：优化设置（可选）

### 6.1 开启缓存
在 "Caching" 菜单中配置缓存规则，加速静态资源访问。

### 6.2 开启Brotli压缩
在 "Speed" → "Optimization" 中开启 Brotli 压缩。

### 6.3 配置页面规则
可以为不同路径配置不同的缓存策略。

## 常见问题

### Q1: DNS更改后多久生效？
A: 通常5-30分钟，最长可能需要48小时。

### Q2: Cloudflare能访问我的443端口吗？
A: 需要测试。运营商通常只屏蔽普通用户到443的连接，但可能允许服务器之间的连接。

### Q3: 如果Cloudflare也无法访问443端口怎么办？
A: 需要使用Cloudflare Workers来转发到8443端口（稍微复杂一些）。

## 下一步

配置完成后，请告诉我进展，我会帮你继续优化配置。
