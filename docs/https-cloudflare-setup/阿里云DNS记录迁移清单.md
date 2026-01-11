# 阿里云DNS记录迁移到Cloudflare清单

## 重要邮箱相关记录（必须迁移，灰色云朵）

### MX记录（邮件服务器）
```
@ → MX → mx1.qiye.aliyun.com (优先级 5)
@ → MX → mx2.qiye.aliyun.com (优先级 10)
@ → MX → mx3.qiye.aliyun.com (优先级 15)
```
⚠️ 代理状态：**灰色云朵（DNS only）**

### TXT记录（SPF防伪造）
```
@ → TXT → v=spf1 include:spf.qiye.aliyun.com -all
```
⚠️ 代理状态：**灰色云朵（DNS only）**

### CNAME记录（邮箱服务）
```
mail → CNAME → qiye.aliyun.com
smtp → CNAME → smtp.qiye.aliyun.com
imap → CNAME → imap.qiye.aliyun.com
pop3 → CNAME → pop3.qiye.aliyun.com
```
⚠️ 代理状态：**灰色云朵（DNS only）**

## 网站相关记录（需要迁移）

### 主要网站记录
```
home → CNAME → ibubble.vicp.net
```
✅ 代理状态：**橙色云朵（Proxied）** - 这是你要加速的网站

### 其他子域名（根据需要选择是否代理）
```
www → A → 47.109.103.230
web → A → 121.42.87.162
ai → A → 47.108.211.219
exam → A → 47.108.211.219
```
建议：如果这些也是网站，可以设为橙色云朵；如果是其他服务，设为灰色云朵。

## SSL证书验证记录（必须迁移）

### Let's Encrypt验证记录
```
_acme-challenge.home → TXT → (验证字符串)
_acme-challenge.www → TXT → (验证字符串)
```
⚠️ 代理状态：**灰色云朵（DNS only）**

## 其他记录（可选迁移）

根据你的需求，以下记录也需要迁移：
- light, qi, new, nj, data, jd, cd, hk, aws, data1 等各种A记录
- 这些看起来是各种服务的子域名

## NS记录（不需要迁移）
```
ddns → NS → f1g1ns2.dnspod.net
ddns → NS → f1g1ns1.dnspod.net
```
这些是DDNS服务的记录，如果你在用DNSPod的DDNS服务，需要保留。

## Cloudflare配置步骤

### 步骤1：在Cloudflare添加域名
1. 访问 https://dash.cloudflare.com
2. 添加站点：`liukun.com`
3. 选择Free计划

### 步骤2：Cloudflare会自动扫描DNS记录
等待扫描完成，检查是否所有记录都被导入。

### 步骤3：手动检查并调整记录

#### 必须设为灰色云朵（DNS only）的记录：
- ✓ 所有MX记录
- ✓ mail, smtp, imap, pop3 的CNAME记录
- ✓ @ 的TXT记录（SPF）
- ✓ _acme-challenge 的TXT记录

#### 可以设为橙色云朵（Proxied）的记录：
- ✓ home → ibubble.vicp.net（你的主要网站）
- ✓ www, web, ai, exam 等网站子域名（如果需要CDN加速）

### 步骤4：修改DNS服务器
只有在确认所有邮箱记录都正确配置后，才修改DNS服务器为Cloudflare提供的地址。

### 步骤5：测试
修改后立即测试：
1. 发送和接收邮件
2. 访问 https://home.liukun.com
3. 访问其他子域名

## 回答你的问题

> 以后要做DNS解析，必须到Cloudflare网站上进行了是吧？

**是的**，修改DNS服务器到Cloudflare后：
- ✅ 所有DNS记录的管理都在Cloudflare进行
- ✅ 阿里云的DNS解析设置将不再生效
- ✅ 但域名所有权还是在阿里云，只是DNS管理权转移到Cloudflare

### 优点：
- Cloudflare的DNS解析速度更快（全球anycast网络）
- 免费的CDN和DDoS防护
- 更强大的DNS管理功能

### 缺点：
- 需要在Cloudflare管理DNS，不能在阿里云管理了
- 如果想改回来，需要重新修改DNS服务器

### 如果以后想改回阿里云：
1. 在阿里云重新添加所有DNS记录
2. 将DNS服务器改回阿里云的DNS服务器
3. 等待DNS生效即可

## 建议

1. **先不要急着修改DNS服务器**
2. 先在Cloudflare添加域名，查看自动扫描的结果
3. 仔细核对所有邮箱相关记录
4. 确认无误后再修改DNS服务器
5. 修改后立即测试邮箱功能

## 风险评估

- 风险等级：**低**（只要正确配置邮箱记录）
- 回滚难度：**简单**（改回DNS服务器即可）
- 建议操作时间：**工作日白天**（方便出问题时联系客服）

需要我继续指导具体操作步骤吗？
