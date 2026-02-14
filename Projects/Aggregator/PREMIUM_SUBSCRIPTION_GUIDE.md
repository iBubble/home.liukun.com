# 付费订阅节点管理指南

## 概述

本系统实现了付费订阅节点的自动更新和测试功能,确保始终使用最新的高质量节点访问国外网站。

## 功能特性

### 1. 自动订阅更新
- **订阅链接**: https://16412.nginx24ppy.xyz/link/hXvsVfrh8PP0ViD3?clash=1
- **更新频率**: 每6小时自动更新一次 (00:00, 06:00, 12:00, 18:00)
- **节点总数**: 103个节点
- **优先节点**: 
  - 专线|美国02解锁
  - 专线|台湾02解锁
  - 专线|日本02解锁

### 2. 节点测试
- 自动测试节点访问国外网站的能力
- 测试网站: Google, Facebook, GitHub, Linux.do
- 测试结果: 3/4 成功 (Google ✓, Facebook ✓, GitHub ✓)

## 文件说明

### 核心脚本

1. **premium_subscription_updater.js**
   - 功能: 下载订阅并解析节点
   - 输出: `premium_nodes.json` (包含所有节点信息)
   - 日志: `logs/premium_subscription.log`

2. **test_premium_nodes.js**
   - 功能: 测试节点访问外网能力
   - 使用: 启动 Clash 代理并测试多个网站
   - 测试结果: 实时显示每个网站的访问状态

3. **setup_premium_cron.sh**
   - 功能: 设置定时任务
   - 执行: 自动配置 crontab 每6小时更新一次

### 数据文件

- **premium_nodes.json**: 存储最新的节点数据
  ```json
  {
    "updated_at": "2026-02-10T08:30:18.953Z",
    "subscription": "订阅链接",
    "total_nodes": 103,
    "priority_nodes": ["专线|日本02解锁", "专线|美国02解锁", "专线|台湾02解锁"],
    "nodes": [...]
  }
  ```

## 使用方法

### 手动更新订阅

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node premium_subscription_updater.js
```

### 测试节点

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
node test_premium_nodes.js
```

### 查看定时任务

```bash
# 查看所有定时任务
crontab -l

# 查看付费订阅任务
crontab -l | grep premium_subscription_updater

# 查看更新日志
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/premium_subscription.log
```

### 删除定时任务

```bash
crontab -l | grep -v 'premium_subscription_updater.js' | crontab -
```

## 定时任务配置

当前配置:
```
0 */6 * * * cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator && node premium_subscription_updater.js >> logs/premium_subscription.log 2>&1
```

执行时间:
- 每天 00:00
- 每天 06:00
- 每天 12:00
- 每天 18:00

## 测试结果

最新测试结果 (2026-02-10):

| 网站 | 状态 | 响应时间 | 说明 |
|------|------|----------|------|
| Google | ✓ 成功 | 452ms | 正常访问 |
| Facebook | ✓ 成功 | 2456ms | 正常访问 |
| GitHub | ✓ 成功 | 2997ms | 正常访问 |
| Linux.do | ✗ 失败 | - | HTTP 403 (反爬虫) |

**成功率**: 75% (3/4)

## 优先节点说明

系统会优先使用以下节点:
1. **专线|美国02解锁** - 适合访问美国网站
2. **专线|台湾02解锁** - 适合访问亚洲网站
3. **专线|日本02解锁** - 适合访问日本网站

这些节点在配置文件中排在最前面,Clash 会优先选择使用。

## 故障排查

### 1. 订阅更新失败

检查网络连接:
```bash
curl -I https://16412.nginx24ppy.xyz/link/hXvsVfrh8PP0ViD3?clash=1
```

查看错误日志:
```bash
tail -50 logs/premium_subscription.log
```

### 2. 节点测试失败

检查 Clash 是否正常运行:
```bash
ps aux | grep clash
```

检查端口是否被占用:
```bash
netstat -tlnp | grep 7920
```

### 3. 定时任务未执行

检查 cron 服务状态:
```bash
sudo systemctl status cron
```

查看 cron 日志:
```bash
grep CRON /var/log/syslog | tail -20
```

## 注意事项

1. **订阅链接保密**: 订阅链接包含个人认证信息,请勿泄露
2. **节点有效期**: 付费订阅节点有有效期,过期后需要续费
3. **流量限制**: 注意订阅套餐的流量限制,避免超额使用
4. **合法使用**: 仅用于合法的学习和开发目的

## 更新历史

- **2026-02-10**: 初始版本
  - 实现订阅自动更新功能
  - 实现节点测试功能
  - 配置定时任务每6小时更新
  - 测试成功率 75% (3/4)

## 相关链接

- 项目地址: https://home.liukun.com:8443/Projects/Aggregator/
- Clash 文档: https://github.com/Dreamacro/clash
- 订阅管理: (付费订阅服务商提供的管理面板)
