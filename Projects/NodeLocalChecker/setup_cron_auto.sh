#!/bin/bash
# 自动设置NodeLocalChecker定时任务(无需交互)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_UPDATE_SCRIPT="$SCRIPT_DIR/scripts/auto_update.php"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/auto_update.log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

echo "=== 自动设置NodeLocalChecker定时任务 ==="
echo ""

# 检查脚本是否存在
if [ ! -f "$AUTO_UPDATE_SCRIPT" ]; then
    echo "✗ 错误: 自动更新脚本不存在"
    echo "  路径: $AUTO_UPDATE_SCRIPT"
    exit 1
fi

# Cron任务配置
# 每天4次执行: 02:00, 08:00, 14:00, 20:00
CRON_SCHEDULE="0 2,8,14,20 * * *"
CRON_COMMAND="php $AUTO_UPDATE_SCRIPT >> $LOG_FILE 2>&1"
CRON_ENTRY="$CRON_SCHEDULE $CRON_COMMAND"

echo "计划任务配置:"
echo "  执行频率: 每天4次 (02:00, 08:00, 14:00, 20:00)"
echo "  执行脚本: $AUTO_UPDATE_SCRIPT"
echo "  日志文件: $LOG_FILE"
echo ""

# 删除旧任务(如果存在)
if crontab -l 2>/dev/null | grep -F "$AUTO_UPDATE_SCRIPT" > /dev/null; then
    echo "检测到已存在的任务,正在删除..."
    crontab -l 2>/dev/null | grep -v "$AUTO_UPDATE_SCRIPT" | crontab -
    echo "✓ 已删除旧任务"
fi

# 添加新任务
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

if [ $? -eq 0 ]; then
    echo "✓ Cron任务设置成功"
    echo ""
    echo "当前任务:"
    echo "----------------------------------------"
    crontab -l | grep "$AUTO_UPDATE_SCRIPT"
    echo "----------------------------------------"
    echo ""
    echo "任务详情:"
    echo "  - 执行时间: 每天 02:00, 08:00, 14:00, 20:00"
    echo "  - 下次执行: 请查看 crontab -l 确认"
    echo "  - 查看日志: tail -f $LOG_FILE"
    echo "  - 查看任务: crontab -l"
    echo "  - 删除任务: crontab -l | grep -v 'auto_update.php' | crontab -"
    echo ""
    echo "✓ 设置完成!"
else
    echo "✗ Cron任务设置失败"
    exit 1
fi
