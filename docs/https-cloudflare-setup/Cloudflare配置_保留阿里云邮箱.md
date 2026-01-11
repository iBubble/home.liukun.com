# Cloudflare配置 - 保留阿里云企业邮箱

## 重要说明
修改DNS服务器到Cloudflare后，**必须**在Cloudflare中添加所有邮箱相关的DNS记录，否则邮箱会失效。

## 准备工作：导出现有DNS记录

### 步骤1：查看当前DNS记录
在修改DNS服务器之前，先记录下所有现有的DNS配置。

1. 登录阿里云控制台
2. 进入域名管理 → 找到 `liukun.com`
3. 点击"解析设置"
4. **截图或记录所有DNS记录**，特别是：
   - MX记录（邮件服务器）
   - TXT记录（SPF、DKIM等）
   - CNAME记录（邮箱相关）

### 阿里云企业邮箱常见DNS记录

阿里云企业邮箱通常需要以下记录：

#### MX记录（邮件服务器）
```
类型: MX
主机记录: @
记录值: mxn.mxhichina.com （n为1-5的数字）
优先级: 5 或 10
```

可能有多条MX记录：
- mx1.mxhichina.com (优先级 5)
- mx2.mxhichina.com (优先级 10)
- mx3.mxhichina.com (优先级 15)

#### TXT记录（SPF防伪造）
```
类型: TXT
主机记录: @
记录值: v=spf1 include:spf.mxhichina.com -all
```

#### CNAME记录（邮箱管理后台）
```
类型: CNAME
主机记录: mail
记录值: mail.mxhichina.com
```

## Cloudflare配置步骤

### 步骤1：添加域名到Cloudflare
1. 访问 https://dash.cloudflare.com
2. 点击 "Add a Site"
3. 输入 `liukun.com`
4. 选择 Free 计划

### 步骤2：DNS记录扫描
Cloudflare会自动扫描现有DNS记录，**仔细检查**是否包含所有邮箱相关记录。

### 步骤3：手动添加/确认邮箱DNS记录

在Cloudflare的DNS管理页面，确保有以下记录：

#### 添加MX记录
```
Type: MX
Name: @ (或 liukun.com)
Mail server: mx1.mxhichina.com
Priority: 5
Proxy status: 灰色云朵（DNS only）⚠️ 重要：MX记录不能代理！
TTL: Auto
```

如果有多条MX记录，都要添加。

#### 添加TXT记录（SPF）
```
Type: TXT
Name: @ (或 liukun.com)
Content: v=spf1 include:spf.mxhichina.com -all
Proxy status: 灰色云朵（DNS only）
TTL: Auto
```

#### 添加CNAME记录（邮箱管理）
```
Type: CNAME
Name: mail
Target: mail.mxhichina.com
Proxy status: 灰色云朵（DNS only）⚠️ 重要：邮箱相关不能代理！
TTL: Auto
```

#### 添加网站记录（home子域名）
```
Type: CNAME
Name: home
Target: ibubble.vicp.net
Proxy status: 橙色云朵（Proxied）✓ 只有网站需要代理！
TTL: Auto
```

### 步骤4：验证DNS记录完整性

在Cloudflare中，确认以下记录都已添加：
- ✓ MX记录（所有邮件服务器）
- ✓ TXT记录（SPF）
- ✓ CNAME记录（mail）
- ✓ 其他阿里云邮箱要求的记录
- ✓ home子域名的记录（用于网站）

### 步骤5：修改DNS服务器

**只有在确认所有邮箱记录都已添加后**，才修改DNS服务器：

1. 登录阿里云
2. 域名管理 → DNS修改
3. 改为Cloudflare提供的DNS服务器
4. 保存

### 步骤6：等待生效并测试

等待5-30分钟后：

#### 测试邮箱是否正常
```bash
# 测试MX记录
nslookup -type=mx liukun.com

# 测试邮箱域名
nslookup mail.liukun.com

# 测试SPF记录
nslookup -type=txt liukun.com
```

#### 测试网站是否正常
```bash
# 测试网站域名
nslookup home.liukun.com

# 访问网站
curl -I https://home.liukun.com
```

## 关键注意事项

### ⚠️ 重要：代理状态设置

| 记录类型 | 用途 | 代理状态 | 说明 |
|---------|------|---------|------|
| MX | 邮件服务器 | 灰色云朵（DNS only） | 邮箱记录不能代理！ |
| TXT | SPF/DKIM | 灰色云朵（DNS only） | 邮箱记录不能代理！ |
| CNAME (mail) | 邮箱管理 | 灰色云朵（DNS only） | 邮箱记录不能代理！ |
| CNAME (home) | 网站 | 橙色云朵（Proxied） | 网站需要代理 |
| A/AAAA (www/@) | 网站 | 橙色云朵（Proxied） | 网站需要代理 |

### 为什么邮箱记录不能代理？
- Cloudflare的代理功能是为HTTP/HTTPS设计的
- 邮件协议（SMTP/POP3/IMAP）不能通过Cloudflare代理
- 必须使用"DNS only"模式，让邮件直接连接到阿里云服务器

## 如果邮箱出问题怎么办？

### 方案1：立即回滚
如果配置后邮箱无法使用：
1. 立即将DNS服务器改回阿里云
2. 等待DNS恢复（5-30分钟）
3. 邮箱会恢复正常

### 方案2：检查DNS记录
1. 在Cloudflare中检查所有邮箱相关记录
2. 确保代理状态都是"灰色云朵"
3. 确保记录值与阿里云原配置一致

### 方案3：联系阿里云客服
如果不确定需要哪些DNS记录，可以：
1. 联系阿里云企业邮箱客服
2. 询问完整的DNS配置要求
3. 在Cloudflare中逐一添加

## 推荐操作流程

1. **先不要修改DNS服务器**
2. 在阿里云记录下所有DNS配置（截图）
3. 在Cloudflare中添加域名
4. 在Cloudflare中添加所有DNS记录
5. **仔细核对**邮箱相关记录
6. 确认无误后，再修改DNS服务器
7. 修改后立即测试邮箱和网站

## 备用方案：只代理子域名

如果担心影响邮箱，可以采用更保守的方案：

**不修改根域名的DNS服务器**，只在阿里云添加一条记录：
```
类型: CNAME
主机记录: home
记录值: home-proxy.你的Cloudflare域名
```

但这种方案需要Cloudflare的付费功能，不推荐。

## 总结

- ✓ 修改DNS服务器是安全的，只要正确配置邮箱记录
- ✓ 关键是要把所有邮箱相关的DNS记录都迁移到Cloudflare
- ✓ 邮箱记录必须使用"灰色云朵"（DNS only）
- ✓ 只有网站记录使用"橙色云朵"（Proxied）
- ✓ 建议先截图保存现有配置，以便出问题时回滚

需要我帮你检查现有的DNS配置吗？
