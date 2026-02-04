# 自动扫描 Cron 任务配置指南

## 概述

本指南说明如何在宝塔面板中配置自动扫描任务，每6小时自动扫描一次机场节点。

## 任务说明

- **执行频率**: 每6小时一次
- **执行时间**: 00:00, 06:00, 12:00, 18:00
- **扫描时长**: 约10-30分钟
- **自动同步**: 扫描完成后自动更新网站数据
- **日志记录**: 所有操作都会记录到日志文件

## 在宝塔面板中配置

### 方法一: 使用宝塔面板界面（推荐）

1. **登录宝塔面板**
   - 访问: `http://your-server-ip:8888`
   - 使用管理员账号登录

2. **打开计划任务**
   - 点击左侧菜单 "计划任务"
   - 点击 "添加计划任务"

3. **配置任务**
   ```
   任务类型: Shell脚本
   任务名称: 机场聚合器自动扫描
   执行周期: N小时
   小时数: 6
   脚本内容:
   ```
   ```bash
   #!/bin/bash
   /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh
   ```

4. **保存并启用**
   - 点击 "添加任务"
   - 确保任务状态为 "启用"

### 方法二: 使用 Crontab 命令

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每6小时执行一次）
0 */6 * * * /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh >> /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log 2>&1

# 保存并退出
```

### 方法三: 自定义执行时间

如果你想在特定时间执行，可以使用以下配置：

```bash
# 每天 00:00, 06:00, 12:00, 18:00 执行
0 0,6,12,18 * * * /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 每天凌晨 2:00 和下午 14:00 执行
0 2,14 * * * /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 每天凌晨 3:00 执行一次
0 3 * * * /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh
```

## 验证任务是否正常运行

### 1. 查看任务日志

```bash
# 查看自动扫描日志
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/auto_scan.log

# 查看扫描详细输出
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/scan_output.log
```

### 2. 检查 Cron 任务状态

```bash
# 查看当前用户的 crontab
crontab -l

# 查看 cron 服务状态
sudo systemctl status cron
```

### 3. 手动测试脚本

```bash
# 手动执行一次扫描
bash /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 查看执行结果
echo $?  # 0 表示成功
```

## 日志文件说明

### auto_scan.log
记录每次自动扫描的关键信息：
- 扫描开始/结束时间
- 扫描耗时
- 节点数量
- 错误信息（如有）

示例：
```
[2026-01-28 18:00:00] ==========================================
[2026-01-28 18:00:00] 开始自动扫描任务
[2026-01-28 18:00:00] ==========================================
[2026-01-28 18:00:00] 📂 工作目录: /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator
[2026-01-28 18:00:00] 🚀 开始扫描机场节点...
[2026-01-28 18:15:32] ✅ 扫描完成，耗时: 15分32秒
[2026-01-28 18:15:32] ✅ clash.yaml 已生成: 13K, 节点数: 55
[2026-01-28 18:15:33] ✅ 节点数据解析完成
[2026-01-28 18:15:33] 📊 nodes.json 节点数: 55
[2026-01-28 18:15:33] ✅ 自动扫描任务完成
```

### scan_output.log
记录 Python 扫描脚本的详细输出：
- 爬取的机场源
- 发现的域名数量
- 订阅链接验证
- 错误和警告信息

### cron.log（如果使用方法二）
记录 crontab 的执行日志

## 监控和维护

### 1. 定期检查日志

```bash
# 查看最近的扫描记录
tail -n 50 /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/auto_scan.log

# 查看是否有错误
grep "错误\|失败" /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/auto_scan.log
```

### 2. 检查节点数据

```bash
# 查看当前节点数
jq '. | length' /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/nodes.json

# 查看最后更新时间
jq '.last_update' /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/status.json
```

### 3. 清理旧日志

脚本会自动清理7天前的日志文件，无需手动操作。

如需手动清理：
```bash
# 清理30天前的日志
find /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs -name "*.log" -type f -mtime +30 -delete
```

## 故障排查

### 问题1: 任务没有执行

**检查步骤**:
```bash
# 1. 检查 cron 服务是否运行
sudo systemctl status cron

# 2. 检查脚本权限
ls -l /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 3. 检查 crontab 配置
crontab -l

# 4. 查看系统日志
sudo tail -f /var/log/syslog | grep CRON
```

**解决方法**:
```bash
# 确保脚本有执行权限
chmod +x /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 重启 cron 服务
sudo systemctl restart cron
```

### 问题2: 扫描失败

**检查步骤**:
```bash
# 查看错误日志
tail -n 100 /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/auto_scan.log

# 手动执行测试
bash /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh
```

**常见原因**:
- Python 依赖缺失
- 网络连接问题
- 磁盘空间不足
- 权限问题

### 问题3: 节点数量为0

**检查步骤**:
```bash
# 检查 clash.yaml 是否生成
ls -lh /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator/data/clash.yaml

# 检查文件内容
head -n 20 /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator/data/clash.yaml

# 手动运行解析脚本
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
python3 parse_nodes.py
```

## 调整扫描参数

如果需要调整扫描参数，编辑 `auto_scan.sh` 文件：

```bash
# 编辑脚本
nano /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 找到这一行并修改参数
python3 subscribe/collect.py \
    --skip \              # 跳过已存在的订阅
    --overwrite \         # 覆盖现有数据
    --pages 5 \           # 爬取页数（增加可获得更多节点）
    --num 64 \            # 并发数（增加可加快速度）
    --targets clash \     # 输出格式
    >> "$SCAN_LOG" 2>&1
```

**参数说明**:
- `--pages N`: 爬取的页数，越大获得的节点越多，但耗时也越长
- `--num N`: 并发线程数，越大速度越快，但消耗资源也越多
- `--skip`: 跳过已存在的订阅，加快速度
- `--overwrite`: 覆盖现有数据文件

## 性能优化建议

### 1. 调整执行时间
在服务器负载较低的时段执行：
```bash
# 凌晨执行（推荐）
0 2,8,14,20 * * * /path/to/auto_scan.sh
```

### 2. 减少扫描频率
如果节点更新不频繁，可以降低扫描频率：
```bash
# 每12小时执行一次
0 */12 * * * /path/to/auto_scan.sh

# 每天执行一次
0 3 * * * /path/to/auto_scan.sh
```

### 3. 限制资源使用
```bash
# 使用 nice 降低优先级
nice -n 19 /path/to/auto_scan.sh

# 使用 ionice 降低 I/O 优先级
ionice -c3 /path/to/auto_scan.sh
```

## 通知配置（可选）

### 邮件通知

在脚本末尾添加邮件通知：
```bash
# 发送完成通知
echo "扫描完成，节点数: $JSON_NODE_COUNT" | mail -s "机场聚合器扫描报告" your@email.com
```

### 企业微信/钉钉通知

使用 webhook 发送通知：
```bash
# 企业微信
curl -X POST "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"扫描完成，节点数: $JSON_NODE_COUNT\"}}"
```

## Web 界面查看

扫描完成后，访问 Web 界面查看结果：
```
https://home.liukun.com:8443/Projects/Aggregator/
```

点击 "刷新数据" 按钮即可看到最新的节点列表。

## 总结

配置完成后，系统将：
1. ✅ 每6小时自动扫描一次
2. ✅ 自动更新网站数据
3. ✅ 记录详细日志
4. ✅ 自动清理旧日志
5. ✅ 无需人工干预

如有问题，请查看日志文件或手动执行脚本进行调试。
