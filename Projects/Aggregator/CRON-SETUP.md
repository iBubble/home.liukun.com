# Aggregator Cron 任务配置指南

## 概述
如果不想启用 PHP 的系统执行函数,可以使用 Cron 任务定时执行扫描。

## 优点
- ✅ 更安全,不需要启用危险的 PHP 函数
- ✅ 自动化,无需手动触发
- ✅ 可控制扫描频率
- ✅ 独立于 Web 请求,不受超时限制

## 配置步骤

### 方法 1: 通过宝塔面板配置 (推荐)

#### 1. 登录宝塔面板
访问: `http://你的服务器IP:8888`

#### 2. 添加计划任务
1. 点击左侧菜单 **"计划任务"**
2. 点击 **"添加任务"** 按钮
3. 填写任务信息:
   - **任务名称**: Aggregator 节点扫描
   - **任务类型**: Shell 脚本
   - **执行周期**: 
     - 每 30 分钟 (推荐)
     - 或 每 1 小时
     - 或 每天 凌晨 2:00
   - **脚本内容**:
     ```bash
     #!/bin/bash
     cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
     php scan.php >> logs/cron.log 2>&1
     ```
4. 点击 **"确定"** 保存

#### 3. 测试任务
点击任务右侧的 **"执行"** 按钮,测试是否正常运行。

#### 4. 查看日志
```bash
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log
```

### 方法 2: 通过命令行配置

#### 1. 编辑 Crontab
```bash
crontab -e
```

#### 2. 添加任务
```bash
# 每 30 分钟执行一次扫描
*/30 * * * * cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator && php scan.php >> logs/cron.log 2>&1

# 或者每天凌晨 2:00 执行
0 2 * * * cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator && php scan.php >> logs/cron.log 2>&1
```

#### 3. 保存并退出
按 `Ctrl+X`, 然后按 `Y`, 最后按 `Enter`

#### 4. 验证任务
```bash
crontab -l
```

## 前端调整

如果使用 Cron 任务,需要调整前端界面:

### 修改 index.html

将 "扫描节点" 按钮改为 "刷新节点列表":

```html
<!-- 原来的按钮 -->
<button id="scanBtn" class="btn btn-primary">
    <i class="fas fa-search mr-2"></i>扫描节点
</button>

<!-- 改为 -->
<button id="refreshBtn" class="btn btn-primary">
    <i class="fas fa-sync-alt mr-2"></i>刷新节点列表
</button>
```

### 修改 app.js

```javascript
// 原来的扫描功能
document.getElementById('scanBtn').addEventListener('click', () => this.startScan());

// 改为刷新功能
document.getElementById('refreshBtn').addEventListener('click', () => this.refreshNodes());

// 新增刷新方法
async refreshNodes() {
    try {
        this.addLog('[刷新] 正在加载最新节点数据...', 'info');
        await this.updateStatus();
        await this.loadNodeList();
        this.addLog('[成功] 节点列表已更新', 'success');
    } catch (error) {
        this.addLog(`[错误] 刷新失败: ${error.message}`, 'error');
    }
}
```

### 添加自动刷新

```javascript
// 在 init() 方法中添加
startAutoRefresh() {
    // 每 30 秒自动刷新一次
    setInterval(() => {
        this.updateStatus();
        this.loadNodeList();
    }, 30000);
}
```

## Cron 时间表达式说明

```
*    *    *    *    *
┬    ┬    ┬    ┬    ┬
│    │    │    │    │
│    │    │    │    └─ 星期几 (0-7, 0和7都表示周日)
│    │    │    └────── 月份 (1-12)
│    │    └─────────── 日期 (1-31)
│    └──────────────── 小时 (0-23)
└───────────────────── 分钟 (0-59)
```

### 常用示例

```bash
# 每 5 分钟
*/5 * * * *

# 每 30 分钟
*/30 * * * *

# 每小时
0 * * * *

# 每天凌晨 2:00
0 2 * * *

# 每周一凌晨 3:00
0 3 * * 1

# 每月 1 号凌晨 4:00
0 4 1 * *

# 工作日每小时
0 * * * 1-5

# 每天 8:00, 12:00, 18:00
0 8,12,18 * * *
```

## 监控和维护

### 1. 查看执行日志
```bash
# 查看最新日志
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log

# 查看最近 50 行
tail -50 /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log

# 搜索错误
grep "错误" /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log
```

### 2. 查看系统 Cron 日志
```bash
# Ubuntu/Debian
sudo tail -f /var/log/syslog | grep CRON

# CentOS/RHEL
sudo tail -f /var/log/cron
```

### 3. 日志轮转
创建日志轮转配置,防止日志文件过大:

```bash
sudo nano /etc/logrotate.d/aggregator
```

内容:
```
/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0664 gemini www
}
```

## 故障排查

### 问题 1: Cron 任务不执行
**检查:**
```bash
# 1. 检查 Cron 服务状态
sudo systemctl status cron

# 2. 检查 Crontab 语法
crontab -l

# 3. 查看系统日志
sudo tail -f /var/log/syslog | grep CRON
```

### 问题 2: 脚本执行失败
**检查:**
```bash
# 1. 手动执行脚本
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
php scan.php

# 2. 检查文件权限
ls -la scan.php

# 3. 检查 PHP 路径
which php
```

### 问题 3: 日志文件权限错误
**解决:**
```bash
# 修复权限
sudo chown gemini:www /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log
sudo chmod 664 /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log
```

## 性能优化

### 1. 调整扫描频率
根据实际需求调整 Cron 执行频率:
- 测试阶段: 每 5-10 分钟
- 生产环境: 每 30-60 分钟
- 低频更新: 每天 1-2 次

### 2. 限制扫描页数
在 `scan.php` 中调整参数:
```bash
python3 subscribe/collect.py --skip --overwrite --pages 1 --num 16 --targets clash
```

### 3. 避免高峰时段
将扫描任务安排在凌晨等低峰时段:
```bash
# 每天凌晨 2:00 执行
0 2 * * *
```

## 通知功能

### 添加邮件通知
修改 Cron 任务,在失败时发送邮件:

```bash
*/30 * * * * cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator && php scan.php >> logs/cron.log 2>&1 || echo "Aggregator scan failed" | mail -s "Aggregator Alert" your@email.com
```

### 添加企业微信通知
在 `scan.php` 中添加通知逻辑:

```php
function sendWechatNotification($message) {
    $webhook = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY";
    $data = [
        'msgtype' => 'text',
        'text' => ['content' => $message]
    ];
    
    $ch = curl_init($webhook);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}
```

## 总结

使用 Cron 任务的优势:
- ✅ 更安全
- ✅ 更稳定
- ✅ 更易维护
- ✅ 不依赖 Web 请求

推荐配置:
- 扫描频率: 每 30 分钟
- 日志保留: 7 天
- 执行时间: 避开高峰时段

## 相关文档
- [宝塔面板 PHP 函数配置指南](../docs/宝塔面板PHP函数配置指南_2026-01-28.md)
- [Aggregator 项目开发完成](../docs/Aggregator项目开发完成_2026-01-28.md)
