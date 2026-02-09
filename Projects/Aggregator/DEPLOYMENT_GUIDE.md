# Antigravity Airport Aggregator - 国内服务器部署指南

**文档版本**: 1.0
**创建日期**: 2026-02-08
**适用备份**: `migration_backup_20260208_051500_full.tar.gz`

---

## 📋 目录

1. [系统要求](#1-系统要求)
2. [部署前准备](#2-部署前准备)
3. [安装系统依赖](#3-安装系统依赖)
4. [项目部署](#4-项目部署)
5. [Nginx/OpenResty 配置](#5-nginxopenresty-配置)
6. [SSL 证书配置](#6-ssl-证书配置)
7. [PM2 服务配置](#7-pm2-服务配置)
8. [定时任务配置](#8-定时任务配置)
9. [防火墙配置](#9-防火墙配置)
10. [验证部署](#10-验证部署)
11. [常见问题](#11-常见问题)
12. [维护指南](#12-维护指南)

---

## 1. 系统要求

### 硬件要求
| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1 GB | 2 GB+ |
| 硬盘 | 10 GB | 20 GB+ |

### 软件要求
| 软件 | 版本 | 说明 |
|------|------|------|
| 操作系统 | CentOS 7+/Ubuntu 20.04+/Debian 10+ | Linux 系统 |
| Node.js | 16.x 或 18.x | 推荐使用 LTS 版本 |
| PM2 | 5.x+ | Node.js 进程管理 |
| Nginx/OpenResty | 1.18+ | 反向代理服务器 |

### 端口要求
| 端口 | 用途 |
|------|------|
| 80 | HTTP (自动跳转 HTTPS) |
| 443 或 8443 | HTTPS |
| 3000 | Node.js 应用 (内部) |

---

## 2. 部署前准备

### 2.1 上传备份文件

将备份文件上传到服务器：

```bash
# 方式一：使用 scp
scp migration_backup_20260208_051500_full.tar.gz root@your-server:/opt/

# 方式二：使用 sftp 工具 (如 FileZilla, WinSCP)
# 上传到 /opt/ 目录
```

### 2.2 创建工作目录

```bash
# 创建应用目录
sudo mkdir -p /opt/1panel/apps/my-node-site
cd /opt/1panel/apps/my-node-site
```

---

## 3. 安装系统依赖

### 3.1 安装 Node.js

**CentOS/RHEL:**
```bash
# 使用 NodeSource 仓库 (离线环境可跳过，使用 nvm)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 或使用 nvm (推荐，离线可预先下载)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**验证安装:**
```bash
node --version   # 应显示 v18.x.x
npm --version    # 应显示 9.x.x 或更高
```

### 3.2 安装 PM2

```bash
sudo npm install -g pm2

# 验证
pm2 --version    # 应显示 5.x.x 或更高
```

### 3.3 安装 Nginx 或 OpenResty

**方式一：使用 1Panel 面板 (推荐)**
```bash
# 1Panel 会自动安装 OpenResty
# 访问面板界面进行安装
```

**方式二：手动安装 Nginx**

CentOS:
```bash
sudo yum install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Ubuntu:
```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 4. 项目部署

### 4.1 解压备份

```bash
cd /opt/1panel/apps/my-node-site

# 解压备份文件
tar -xzvf /opt/migration_backup_20260208_051500_full.tar.gz
```

### 4.2 设置文件权限

```bash
# 设置 Clash 可执行权限
chmod +x bin/clash
chmod +x clash_bin/clash-linux-amd64
chmod +x external/aggregator/clash/clash-linux-*
chmod +x external/aggregator/subconverter/subconverter 2>/dev/null

# 设置目录权限
chmod 755 /opt/1panel/apps/my-node-site
chmod -R 755 logs/
```

### 4.3 创建日志目录

```bash
mkdir -p logs
touch logs/app.log logs/error.log logs/out.log logs/clash.log
```

### 4.4 修改配置文件 (如需要)

编辑 `ecosystem.config.js`，确认路径正确：

```javascript
module.exports = {
    apps: [
        {
            name: 'aggregator',
            script: 'app.js',
            cwd: '/opt/1panel/apps/my-node-site',  // 确认路径
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            error_file: '/opt/1panel/apps/my-node-site/logs/error.log',
            out_file: '/opt/1panel/apps/my-node-site/logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            min_uptime: '5s'
        }
    ]
};
```

### 4.5 测试启动

```bash
# 首次启动测试
cd /opt/1panel/apps/my-node-site
node app.js

# 看到 "Server listening on port 3000" 后按 Ctrl+C 退出
```

---

## 5. Nginx/OpenResty 配置

### 5.1 创建反向代理配置

**如果使用 1Panel (OpenResty):**

创建代理配置文件：
```bash
sudo mkdir -p /opt/1panel/apps/openresty/openresty/www/sites/your-domain.com/proxy/

sudo tee /opt/1panel/apps/openresty/openresty/www/sites/your-domain.com/proxy/nodejs.conf << 'EOF'
# Node.js 应用反向代理配置
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
EOF
```

**如果使用原生 Nginx:**

创建站点配置：
```bash
sudo tee /etc/nginx/conf.d/aggregator.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    # HTTP 跳转 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书路径 (根据实际情况修改)
    ssl_certificate /etc/nginx/ssl/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.com/privkey.pem;
    
    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # 反向代理到 Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF
```

### 5.2 测试并重载配置

**1Panel (OpenResty):**
```bash
docker exec 1Panel-openresty-xxxx nginx -t
docker exec 1Panel-openresty-xxxx nginx -s reload
```

**原生 Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL 证书配置

### 6.1 使用 Let's Encrypt (推荐)

**安装 Certbot:**
```bash
# CentOS
sudo yum install -y certbot python3-certbot-nginx

# Ubuntu
sudo apt-get install -y certbot python3-certbot-nginx
```

**申请证书:**
```bash
sudo certbot --nginx -d your-domain.com
```

### 6.2 手动配置证书

将证书文件放到指定目录：
```bash
sudo mkdir -p /etc/nginx/ssl/your-domain.com/
sudo cp fullchain.pem /etc/nginx/ssl/your-domain.com/
sudo cp privkey.pem /etc/nginx/ssl/your-domain.com/
sudo chmod 600 /etc/nginx/ssl/your-domain.com/*.pem
```

---

## 7. PM2 服务配置

### 7.1 启动应用

```bash
cd /opt/1panel/apps/my-node-site
pm2 start ecosystem.config.js
```

### 7.2 配置开机自启

```bash
# 保存当前进程列表
pm2 save

# 生成启动脚本
pm2 startup

# 执行提示的 sudo 命令，例如：
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user
```

### 7.3 常用 PM2 命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs aggregator

# 重启应用
pm2 restart aggregator

# 停止应用
pm2 stop aggregator

# 删除应用
pm2 delete aggregator

# 监控
pm2 monit
```

---

## 8. 定时任务配置

### 8.1 配置 Cron 任务

```bash
# 编辑 crontab
crontab -e

# 添加以下定时任务 (根据需要调整):

# 每天 6:00 (北京时间) 自动更新节点
0 22 * * * curl -s http://localhost:3000/api/fetchAllSources > /dev/null 2>&1

# 每天 6:00 (北京时间) 重启服务器 (可选)
# 0 22 * * * /sbin/reboot
```

### 8.2 应用内置定时任务

应用已内置 `node-cron` 定时任务，无需额外配置。可在 `app.js` 中查看和修改。

---

## 9. 防火墙配置

### 9.1 开放端口

**CentOS (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --reload
```

**Ubuntu (ufw):**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8443/tcp
sudo ufw reload
```

### 9.2 云服务器安全组

确保在云服务商控制台开放以下端口：
- 80 (HTTP)
- 443 (HTTPS)
- 8443 (如使用)

---

## 10. 验证部署

### 10.1 检查服务状态

```bash
# 检查 PM2
pm2 status

# 检查 Nginx
systemctl status nginx
# 或 (如使用 Docker)
docker ps | grep openresty

# 检查端口
netstat -tlnp | grep -E "(3000|80|443)"
```

### 10.2 测试访问

```bash
# 测试本地接口
curl http://localhost:3000

# 测试 HTTPS (如已配置证书)
curl -k https://localhost:443/

# 测试完整 URL
curl -k https://your-domain.com:8443/Projects/Aggregator/
```

### 10.3 预期结果

访问 `https://your-domain.com/Projects/Aggregator/` 应显示 Aggregator 前端页面。

---

## 11. 常见问题

### Q1: 502 Bad Gateway

**原因**: Node.js 应用未运行

**解决**:
```bash
pm2 status
pm2 restart aggregator
pm2 logs aggregator --lines 50
```

### Q2: 应用启动失败

**原因**: 端口被占用或权限不足

**解决**:
```bash
# 检查端口
lsof -i :3000

# 检查权限
ls -la /opt/1panel/apps/my-node-site/

# 查看错误日志
cat /opt/1panel/apps/my-node-site/logs/error.log
```

### Q3: Clash 无法启动

**原因**: 可执行权限不足

**解决**:
```bash
chmod +x /opt/1panel/apps/my-node-site/bin/clash
chmod +x /opt/1panel/apps/my-node-site/clash_bin/clash-linux-amd64
```

### Q4: SSL 证书错误

**原因**: 证书路径错误或证书过期

**解决**:
```bash
# 检查证书
openssl x509 -in /path/to/cert.pem -text -noout

# 重新申请
certbot renew
```

### Q5: 定时任务不执行

**原因**: Cron 服务未运行

**解决**:
```bash
systemctl status crond   # CentOS
systemctl status cron    # Ubuntu

# 启动服务
systemctl start crond
```

---

## 12. 维护指南

### 12.1 日志管理

```bash
# 查看应用日志
tail -f /opt/1panel/apps/my-node-site/logs/app.log

# 查看错误日志
tail -f /opt/1panel/apps/my-node-site/logs/error.log

# 清理大日志文件
truncate -s 0 /opt/1panel/apps/my-node-site/logs/out.log
```

### 12.2 备份数据

定期备份以下文件：
- `proxies.json` - 代理节点数据
- `purity_db.json` - 纯净度数据库
- `email_config.json` - 邮箱配置
- `linuxdo_cookie.txt` - 登录凭证

### 12.3 更新应用

```bash
# 停止应用
pm2 stop aggregator

# 备份当前版本
tar -czvf backup_before_update.tar.gz app.js Projects/

# 更新文件 (上传新版本)

# 重启应用
pm2 restart aggregator
```

### 12.4 监控告警

建议配置：
- **Uptime 监控**: 使用 UptimeRobot 等服务监控网站可用性
- **日志告警**: 配置日志分析工具检测错误
- **资源监控**: 使用 PM2 Plus 或 Prometheus 监控资源使用

---

## 📁 项目结构

```
/opt/1panel/apps/my-node-site/
├── app.js                    # 主应用程序
├── index.js                  # 入口文件
├── ecosystem.config.js       # PM2 配置
├── package.json              # NPM 配置
├── node_modules/             # NPM 依赖 (已包含)
├── bin/
│   └── clash                 # Clash 核心
├── clash_bin/
│   └── clash-linux-amd64     # Clash 可执行文件
├── clash_data/               # Clash 运行数据
├── clash_template.yaml       # Clash 模板
├── external/
│   └── aggregator/           # GitHub 第三方组件
│       ├── clash/            # 多平台 Clash
│       ├── subconverter/     # 订阅转换器
│       └── subscribe/        # 订阅脚本
├── logs/                     # 日志目录
├── Projects/
│   └── Aggregator/
│       ├── index.html        # 前端页面
│       └── Aggregator.yaml   # 生成的订阅配置
├── proxies.json              # 代理节点数据
├── purity_db.json            # 纯净度数据库
├── linuxdo_auth.js           # Linux.do 认证
├── tempmail_service.js       # 临时邮箱服务
└── webmail_service.js        # Web 邮箱服务
```

---

## 📞 支持

如遇问题，请检查：
1. 日志文件 (`logs/error.log`)
2. PM2 状态 (`pm2 status`)
3. Nginx 配置 (`nginx -t`)

---

**祝部署顺利！** 🚀
