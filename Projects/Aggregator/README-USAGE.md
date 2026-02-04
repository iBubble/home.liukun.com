# Aggregator 使用说明

## 重要说明

真实的机场节点扫描需要 **10-30 分钟**，无法在 Web 界面中实时完成。

## 推荐使用方式

### 方案 1: 一键配置自动扫描（最推荐）⭐⭐⭐⭐⭐

使用配置脚本快速设置自动扫描：

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
bash setup_cron.sh
```

**功能特点**:
- ✅ 交互式配置界面
- ✅ 多种扫描频率选项（6小时/12小时/每天）
- ✅ 自动配置 Cron 任务
- ✅ 支持立即测试运行
- ✅ 可随时查看/删除任务

**扫描频率选项**:
1. 每 6 小时一次（推荐）
2. 每 12 小时一次
3. 每天一次（凌晨 3:00）
4. 每天两次（凌晨 3:00 和下午 15:00）
5. 自定义时间

配置完成后，系统将自动：
- 📡 定时扫描机场节点
- 🔄 自动更新网站数据
- 📝 记录详细日志
- 🧹 自动清理旧日志

**查看日志**:
```bash
# 查看自动扫描日志
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/auto_scan.log

# 查看扫描详细输出
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/scan_output.log
```

详细说明请查看: [CRON-AUTO-SCAN.md](CRON-AUTO-SCAN.md)

### 方案 2: 手动配置 Cron 任务 ⭐⭐⭐⭐

**优点**: 自动化、稳定、不需要手动触发

**在宝塔面板配置**:

1. 打开宝塔面板 → 计划任务
2. 添加任务:
   - 任务类型: Shell 脚本
   - 任务名称: 机场聚合器自动扫描
   - 执行周期: N小时（输入 6）
   - 脚本内容:
   ```bash
   #!/bin/bash
   /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh
   ```
3. 保存并启用

**使用 Crontab 配置**:

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每6小时执行一次）
0 */6 * * * /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh >> /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/cron.log 2>&1
```

详细配置说明请查看: [CRON-SETUP.md](CRON-SETUP.md)

### 方案 3: 命令行手动扫描 ⭐⭐⭐

**适用场景**: 需要立即更新节点时

**执行步骤**:

```bash
# 1. SSH 登录服务器
ssh gemini@your-server

# 2. 进入项目目录
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator

# 3. 运行扫描（需要 10-30 分钟）
cd external/aggregator
python3 subscribe/collect.py --skip --overwrite --pages 5 --num 64 --targets clash

# 4. 解析节点数据
cd ../..
python3 parse_nodes.py

# 5. 查看结果
curl -s "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/status"
```

**或使用自动扫描脚本**:

```bash
# 直接运行自动扫描脚本
bash /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 后台运行
nohup bash /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh > /dev/null 2>&1 &
```

### 方案 4: 使用现有数据 ⭐⭐

**说明**: `external/aggregator/data/` 目录已经有扫描好的数据

**快速更新**:

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
python3 parse_nodes.py
```

这会立即解析现有的 `clash.yaml` 文件并更新节点列表。

## Web 界面功能说明

访问地址: https://home.liukun.com:8443/Projects/Aggregator/

### 可用功能
- ✅ 刷新数据 - 从服务器加载最新节点
- ✅ 查看节点列表 - 显示所有可用节点
- ✅ 验证节点延迟 - 测试节点速度
- ✅ 启动订阅服务器 - 生成订阅链接

### 不可用功能
- ❌ 实时扫描 - 扫描时间太长（10-30分钟），不适合 Web 触发

### 使用流程

1. **配置自动扫描**（首次使用）
   ```bash
   bash setup_cron.sh
   ```

2. **访问 Web 界面**
   - 打开: https://home.liukun.com:8443/Projects/Aggregator/
   - 点击"刷新数据"查看最新节点

3. **验证节点**（可选）
   - 点击"验证节点"测试延迟
   - 查看节点列表中的延迟信息

4. **使用订阅**（可选）
   - 点击"启动订阅服务器"
   - 复制订阅链接到 Clash 客户端

## 扫描参数说明

```bash
python3 subscribe/collect.py \
  --skip \              # 跳过节点验证（加快速度）
  --overwrite \         # 覆盖已有数据
  --pages 5 \           # 爬取页数（越多越慢，节点越多）
  --num 64 \            # 并发线程数
  --targets clash       # 生成格式
```

**参数调整建议**:
- 快速扫描: `--pages 2 --num 32` (5-10分钟)
- 标准扫描: `--pages 5 --num 64` (10-20分钟)
- 完整扫描: `--pages 10 --num 128` (20-30分钟)

## 日志文件说明

### auto_scan.log
记录自动扫描的关键信息：
```bash
tail -f logs/auto_scan.log
```

### scan_output.log
记录 Python 扫描脚本的详细输出：
```bash
tail -f logs/scan_output.log
```

### cron.log
记录 Cron 任务的执行日志：
```bash
tail -f logs/cron.log
```

## 故障排查

### 问题 1: 节点数为 0
**原因**: 还没有运行过扫描

**解决**:
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
python3 parse_nodes.py
```

### 问题 2: 扫描卡住不动
**原因**: 网络问题或机场源失效

**解决**:
```bash
# 查看扫描进程
ps aux | grep collect.py

# 杀掉卡住的进程
sudo pkill -f collect.py

# 重新扫描
bash auto_scan.sh
```

### 问题 3: 扫描时间太长
**原因**: 参数设置过大

**解决**: 编辑 `auto_scan.sh`，减少 `--pages` 和 `--num` 参数

### 问题 4: Cron 任务没有执行
**原因**: Cron 服务未启动或配置错误

**解决**:
```bash
# 检查 cron 服务
sudo systemctl status cron

# 查看 crontab 配置
crontab -l

# 查看系统日志
sudo tail -f /var/log/syslog | grep CRON

# 手动测试脚本
bash auto_scan.sh
```

### 问题 5: 权限错误
**原因**: 脚本没有执行权限

**解决**:
```bash
chmod +x /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh
chmod +x /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/setup_cron.sh
```

## 监控和维护

### 查看任务状态

```bash
# 查看 Cron 任务
crontab -l

# 查看正在运行的扫描
ps aux | grep collect.py

# 查看最近的扫描记录
tail -n 50 logs/auto_scan.log
```

### 检查数据更新

```bash
# 查看节点数量
jq '. | length' data/nodes.json

# 查看最后更新时间
jq '.last_update' data/status.json

# 查看数据文件
ls -lh data/
```

### 清理日志

```bash
# 自动清理（脚本已包含）
# 保留最近 7 天的日志

# 手动清理 30 天前的日志
find logs/ -name "*.log" -type f -mtime +30 -delete
```

## 最佳实践

1. **使用自动扫描**
   - 运行 `bash setup_cron.sh` 配置每 6 小时扫描一次
   - 无需人工干预，自动保持节点更新

2. **Web 界面使用**
   - 只用于查看节点列表和验证延迟
   - 不要尝试在 Web 界面触发扫描

3. **定期检查**
   - 每周查看一次日志，确保扫描正常
   - 检查节点数量是否合理

4. **性能优化**
   - 在服务器负载低的时段执行扫描（如凌晨）
   - 根据需求调整扫描频率和参数

## 相关文档

- [自动扫描配置指南](./CRON-AUTO-SCAN.md) - 详细的 Cron 任务配置说明
- [Cron 任务配置](./CRON-SETUP.md) - 手动配置 Cron 任务
- [宝塔面板配置](../../docs/宝塔面板PHP函数配置指南_2026-01-28.md) - PHP 函数配置
- [项目真实情况说明](../../docs/Aggregator项目诚实总结_2026-01-28.md) - 项目完整说明

## 快速开始

**首次使用**:
```bash
# 1. 配置自动扫描
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
bash setup_cron.sh

# 2. 选择"每 6 小时一次"

# 3. 立即测试一次
bash auto_scan.sh

# 4. 访问 Web 界面
# https://home.liukun.com:8443/Projects/Aggregator/
```

**日常使用**:
- 访问 Web 界面查看节点
- 系统自动每 6 小时更新一次
- 无需任何手动操作

就这么简单！🎉
