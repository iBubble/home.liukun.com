# 网络监测系统 - 快速开始

## 一次性设置（首次使用）

### 1. 启动守护进程

在服务器上执行：
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Network
./start-monitor.sh
```

**重要**: 守护进程启动后会在后台等待，不会自动开始监测。

### 2. 验证守护进程状态

```bash
ps aux | grep monitor-daemon | grep -v grep
```

应该看到类似输出：
```
gemini   2484455  0.4  0.4 112988 36888 pts/13   S    19:30   0:00 php /www/wwwroot/ibubble.vicp.net/Projects/Network/monitor-daemon.php
```

## 日常使用

### 开始监测

1. 打开浏览器访问：https://home.liukun.com:8443/Projects/Network/
2. 选择监测间隔（默认每5秒）
3. 点击"开始监测"按钮
4. 守护进程会立即开始执行监测任务
5. **可以关闭浏览器**，监测会在后台持续运行

### 查看监测状态

- 任何时候打开页面都会自动同步当前状态
- 如果监测正在运行，会显示"监测中..."
- 可以看到实时的网络状态和统计数据

### 停止监测

- 任何客户端点击"停止监测"按钮
- 守护进程会停止监测并自动保存日志
- 所有打开的页面会同步显示停止状态

## 特性说明

### ✅ 多客户端同步
- 所有客户端共享同一个监测状态
- A客户端开始监测，B客户端也会看到监测中
- 任何客户端都可以控制开始/停止

### ✅ 后台持续运行
- 关闭浏览器后监测继续运行
- 服务器重启后需要重新启动守护进程
- 监测数据自动保存，不会丢失

### ✅ 自动日志保存
- 每个监测会话自动保存到服务器
- 可以通过下拉菜单查看历史会话
- 日志永久保存在 `logs/` 目录

## 常用命令

```bash
# 查看守护进程日志（实时）
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Network/logs/daemon.log

# 查看最近的监测记录
tail -20 /www/wwwroot/ibubble.vicp.net/Projects/Network/logs/daemon.log

# 停止守护进程
cd /www/wwwroot/ibubble.vicp.net/Projects/Network
./stop-monitor.sh

# 重启守护进程
cd /www/wwwroot/ibubble.vicp.net/Projects/Network
./stop-monitor.sh && sleep 2 && ./start-monitor.sh
```

## 故障排查

### 问题：点击"开始监测"没反应

**解决方案**：
1. 检查守护进程是否运行：`ps aux | grep monitor-daemon`
2. 如果没有运行，执行：`./start-monitor.sh`
3. 刷新页面重试

### 问题：监测数据不更新

**解决方案**：
1. 查看守护进程日志：`tail -f logs/daemon.log`
2. 检查是否有错误信息
3. 重启守护进程

### 问题：多个客户端状态不一致

**解决方案**：
- 等待3-5秒，状态会自动同步
- 刷新页面强制同步

## 系统要求

- PHP 8.2 CLI
- 网络连接（用于监测目标）
- 磁盘空间（用于保存日志）

## 访问地址

https://home.liukun.com:8443/Projects/Network/
