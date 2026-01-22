# Network Monitor 自动启动配置

## 概述

Network Monitor守护进程可以配置为systemd服务，实现服务器重启后自动启动。

## 当前状态

### 手动启动方式（默认）
```bash
# 启动守护进程
bash start-monitor.sh

# 停止守护进程
bash stop-monitor.sh
```

### 检查守护进程状态
```bash
ps aux | grep monitor-daemon.php | grep -v grep
```

## 配置自动启动

### 1. 安装systemd服务

运行安装脚本：
```bash
bash install-service.sh
```

这将：
- 将服务文件复制到 `/etc/systemd/system/`
- 启用开机自启动
- 立即启动服务

### 2. 管理服务

安装后，使用systemd命令管理服务：

```bash
# 查看服务状态
sudo systemctl status network-monitor

# 启动服务
sudo systemctl start network-monitor

# 停止服务
sudo systemctl stop network-monitor

# 重启服务
sudo systemctl restart network-monitor

# 查看日志
sudo journalctl -u network-monitor -f

# 查看最近100行日志
sudo journalctl -u network-monitor -n 100
```

### 3. 卸载服务

如果需要恢复手动启动方式：
```bash
bash uninstall-service.sh
```

这将：
- 停止服务
- 禁用开机自启动
- 删除systemd服务文件

## 服务配置说明

服务文件：`network-monitor.service`

关键配置：
- **User**: gemini - 运行用户
- **Group**: www - 运行用户组
- **Restart**: always - 崩溃后自动重启
- **RestartSec**: 10 - 重启前等待10秒

## 故障排查

### 服务无法启动

1. 检查PHP路径：
```bash
which php
```

2. 检查文件权限：
```bash
ls -la monitor-daemon.php
```

3. 查看详细错误日志：
```bash
sudo journalctl -u network-monitor -xe
```

### 服务频繁重启

查看日志找出原因：
```bash
sudo journalctl -u network-monitor -n 200
```

### 手动测试守护进程

```bash
php monitor-daemon.php
```

## 其他项目

### 检查结果

经检查，`/Projects/` 目录下的其他项目：

1. **AIMovie** - 纯前端项目，无需后台服务
2. **Exam** - PHP应用，由Nginx/Apache处理，无需守护进程
3. **LuckyCoin** - 静态网站，无需后台服务
4. **Proxy** - PHP应用，无需守护进程
5. **Shangri-la** - 纯前端项目，无需后台服务

**结论**：只有Network项目需要配置自动启动的守护进程。

## 推荐配置

对于生产环境，**建议安装systemd服务**，原因：
- ✅ 服务器重启后自动启动
- ✅ 进程崩溃后自动重启
- ✅ 统一的日志管理
- ✅ 标准的服务管理方式

对于开发/测试环境，可以使用手动启动方式。
