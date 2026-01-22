# 网络监测守护进程使用说明

## 概述

网络监测系统支持后台守护进程模式，即使关闭浏览器页面，监测任务也会在服务器端持续运行。

## 架构说明

- **前端页面**: 提供UI界面，显示实时状态和历史数据
- **状态API**: 管理全局监测状态（开始/停止/同步）
- **守护进程**: 在服务器后台持续执行监测任务
- **日志系统**: 自动保存监测数据到文件

## 守护进程管理

### 启动守护进程

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Network
./start-monitor.sh
```

### 停止守护进程

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Network
./stop-monitor.sh
```

### 查看守护进程状态

```bash
ps aux | grep monitor-daemon | grep -v grep
```

### 查看守护进程日志

```bash
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Network/logs/daemon.log
```

## 使用流程

### 1. 启动守护进程（首次使用）

在服务器上执行：
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Network
./start-monitor.sh
```

守护进程会在后台运行，等待监测任务。

### 2. 通过网页控制监测

1. 访问 https://home.liukun.com:8443/Projects/Network/
2. 点击"开始监测"按钮
3. 守护进程会自动开始执行监测任务
4. 可以关闭浏览器，监测继续在后台运行

### 3. 查看监测状态

- 任何客户端打开页面都会自动同步当前监测状态
- 如果监测正在运行，页面会显示"监测中..."
- 实时数据会自动更新

### 4. 停止监测

- 任何客户端点击"停止监测"按钮
- 守护进程会停止监测并保存日志
- 所有客户端会同步停止状态

## 自动启动（可选）

### 使用systemd服务

创建服务文件 `/etc/systemd/system/network-monitor.service`:

```ini
[Unit]
Description=Network Monitor Daemon
After=network.target

[Service]
Type=simple
User=gemini
Group=www
WorkingDirectory=/www/wwwroot/ibubble.vicp.net/Projects/Network
ExecStart=/usr/bin/php /www/wwwroot/ibubble.vicp.net/Projects/Network/monitor-daemon.php
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable network-monitor
sudo systemctl start network-monitor
```

### 使用crontab（开机自启）

编辑crontab：
```bash
crontab -e
```

添加：
```
@reboot /www/wwwroot/ibubble.vicp.net/Projects/Network/start-monitor.sh
```

## 文件说明

- `monitor-daemon.php` - 守护进程主程序
- `start-monitor.sh` - 启动脚本
- `stop-monitor.sh` - 停止脚本
- `logs/daemon.log` - 守护进程日志
- `logs/daemon.pid` - 进程PID文件
- `logs/monitor_state.json` - 全局状态文件
- `logs/session_*.json` - 监测会话数据

## 故障排查

### 守护进程无法启动

1. 检查PHP CLI是否可用：`php -v`
2. 检查文件权限：`ls -la monitor-daemon.php`
3. 查看错误日志：`cat logs/daemon.log`

### 监测数据不更新

1. 检查守护进程是否运行：`ps aux | grep monitor-daemon`
2. 检查状态文件：`cat logs/monitor_state.json`
3. 查看守护进程日志：`tail -f logs/daemon.log`

### 多个客户端状态不同步

- 状态同步间隔为3秒，稍等片刻即可同步
- 检查网络连接是否正常
- 刷新页面强制同步

## 注意事项

1. **单进程模式**: 系统只允许一个守护进程运行
2. **状态同步**: 所有客户端共享同一个监测状态
3. **日志保存**: 监测数据自动保存到服务器，不会丢失
4. **资源占用**: 守护进程占用内存约30-50MB
5. **时区设置**: 已设置为Asia/Shanghai时区

## 性能优化

- 默认监测间隔：5秒
- 建议最小间隔：1秒
- 日志自动保存：每100条或每5分钟
- 最大日志条数：1000条/会话
