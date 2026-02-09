# 服务自动启动配置文档

## 配置完成时间
2026-02-09

## 已配置的自启动服务

### 1. 系统服务（Systemd）

所有系统服务均已配置为开机自启动：

| 服务名称 | 描述 | 状态 | 开机自启 |
|---------|------|------|---------|
| nginx | Nginx Web服务器 | ✅ 运行中 | ✅ 已启用 |
| mysqld | MySQL数据库 | ✅ 运行中 | ✅ 已启用 |
| php-fpm-82 | PHP-FPM 8.2 | ✅ 运行中 | ✅ 已启用 |
| pm2-gemini | PM2进程管理器 | ✅ 运行中 | ✅ 已启用 |

### 2. PM2 管理的应用

PM2 已配置为开机自启动，并会自动恢复以下应用：

| 应用名称 | 描述 | 端口 | 项目路径 |
|---------|------|------|---------|
| aimovie-api | 时光大师AI影视平台API | 3000 | Projects/AIMovie |
| aggregator | 机场聚合器API | 3001 | Projects/Aggregator |
| validator | 节点验证服务 | 3002 | Projects/Aggregator |

### 3. Clash 代理服务

Clash 服务由 PM2 中的 validator 应用管理，会随 PM2 自动启动。

**配置文件位置：**
- Clash 二进制：`Projects/Aggregator/clash_bin/clash-linux-amd64`
- 配置文件：`Projects/Aggregator/clash_bin/validator_config.yaml`

**代理端口：**
- HTTP 代理：7890（仅在需要时启用）
- SOCKS5 代理：7891（仅在需要时启用）
- API 端口：9090（仅在需要时启用）

## 配置命令记录

### PM2 开机自启动配置

```bash
# 1. 设置 PM2 systemd 服务
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u gemini --hp /home/gemini

# 2. 保存当前 PM2 进程列表
pm2 save
```

### 验证配置

```bash
# 检查服务是否启用
systemctl is-enabled nginx mysqld php-fpm-82 pm2-gemini

# 查看 PM2 进程列表
pm2 list

# 查看 PM2 保存的进程配置
cat ~/.pm2/dump.pm2
```

## 服务管理脚本

### 检查所有服务状态

```bash
bash scripts/check_services.sh
```

该脚本会检查：
- 系统服务运行状态和开机自启配置
- PM2 管理的进程状态
- Clash 运行状态
- 关键端口监听状态

### PM2 进程管理

```bash
# 查看进程列表
pm2 list

# 查看进程日志
pm2 logs [应用名称]

# 重启应用
pm2 restart [应用名称]

# 停止应用
pm2 stop [应用名称]

# 启动应用
pm2 start [应用名称]

# 保存当前进程列表（重要！修改后必须执行）
pm2 save
```

## 重启后验证清单

服务器重启后，请按以下步骤验证服务是否正常：

### 1. 检查系统服务

```bash
systemctl status nginx
systemctl status mysqld
systemctl status php-fpm-82
systemctl status pm2-gemini
```

### 2. 检查 PM2 进程

```bash
pm2 list
pm2 logs --lines 50
```

### 3. 检查端口监听

```bash
ss -tuln | grep -E ":(8443|3000|3001|3002)"
```

### 4. 测试 Web 访问

- 主站：https://home.liukun.com:8443/
- Projects页面：https://home.liukun.com:8443/projects.html
- AIMovie：https://home.liukun.com:8443/Projects/AIMovie/
- Aggregator：https://home.liukun.com:8443/Projects/Aggregator/
- NodeLocalChecker：https://home.liukun.com:8443/Projects/NodeLocalChecker/

### 5. 运行完整检查脚本

```bash
bash scripts/check_services.sh
```

## 故障排查

### PM2 进程未启动

```bash
# 手动启动 PM2 服务
sudo systemctl start pm2-gemini

# 查看 PM2 服务日志
sudo journalctl -u pm2-gemini -n 50

# 手动恢复 PM2 进程
pm2 resurrect
```

### 某个应用未启动

```bash
# 查看应用日志
pm2 logs [应用名称] --lines 100

# 手动启动应用
pm2 start [应用名称]

# 如果启动失败，检查应用配置
cd Projects/[项目目录]
# 查看 package.json 或启动脚本
```

### Nginx 未启动

```bash
# 检查配置文件
sudo nginx -t

# 启动 Nginx
sudo systemctl start nginx

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### MySQL 未启动

```bash
# 启动 MySQL
sudo systemctl start mysqld

# 查看错误日志
sudo tail -f /var/log/mysql/error.log
```

## 添加新服务到自启动

### 添加新的 PM2 应用

```bash
# 1. 启动应用
pm2 start app.js --name "my-app"

# 2. 保存进程列表（重要！）
pm2 save

# 3. 验证
pm2 list
```

### 添加新的系统服务

```bash
# 1. 创建 systemd 服务文件
sudo nano /etc/systemd/system/my-service.service

# 2. 重载 systemd
sudo systemctl daemon-reload

# 3. 启用开机自启
sudo systemctl enable my-service

# 4. 启动服务
sudo systemctl start my-service
```

## 注意事项

1. **PM2 进程修改后必须保存**：每次使用 `pm2 start`、`pm2 stop`、`pm2 delete` 等命令修改进程列表后，必须执行 `pm2 save` 保存配置，否则重启后不会恢复。

2. **NodeLocalChecker 不需要后台服务**：NodeLocalChecker 是纯 PHP Web 应用，通过 Nginx + PHP-FPM 提供服务，不需要单独的后台进程。

3. **Clash 按需启动**：NodeLocalChecker 在检测节点时会临时启动 Clash 进程，检测完成后自动关闭，不需要常驻后台。

4. **定期检查**：建议定期运行 `bash scripts/check_services.sh` 检查服务状态。

5. **日志监控**：使用 `pm2 logs` 监控应用日志，及时发现问题。

## 相关文件

- PM2 配置：`~/.pm2/dump.pm2`
- PM2 日志：`~/.pm2/logs/`
- Systemd 服务：`/etc/systemd/system/pm2-gemini.service`
- 服务检查脚本：`scripts/check_services.sh`

## 更新记录

- 2026-02-09：初始配置完成，所有服务已设置为开机自启动
