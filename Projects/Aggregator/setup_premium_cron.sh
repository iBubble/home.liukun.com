#!/bin/bash
# 设置付费订阅自动更新定时任务
# 每6小时自动更新一次

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/premium_subscription_updater.js"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/premium_subscription.log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

echo "=== 设置付费订阅自动更新任务 ==="
echo ""

# 检查脚本是否存在
if [ ! -f "$UPDATE_SCRIPT" ]; then
    echo "✗ 错误: 更新脚本不存在"
    echo "  路径: $UPDATE_SCRIPT"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "✗ 错误: 未安装 Node.js"
    exit 1
fi

# Cron任务配置
# 每天凌晨4点执行一次: 0 4 * * *
CRON_SCHEDULE="0 4 * * *"
CRON_COMMAND="cd $SCRIPT_DIR && node $UPDATE_SCRIPT >> $LOG_FILE 2>&1"
CRON_ENTRY="$CRON_SCHEDULE $CRON_COMMAND"

echo "计划任务配置:"
echo "  执行频率: 每6小时"
echo "  执行脚本: $UPDATE_SCRIPT"
echo "  日志文件: $LOG_FILE"
echo ""

# 删除旧任务(如果存在)
if crontab -l 2>/dev/null | grep -F "premium_subscription_updater.js" > /dev/null; then
    echo "检测到已存在的任务,正在删除..."
    crontab -l 2>/dev/null | grep -v "premium_subscription_updater.js" | crontab -
    echo "✓ 已删除旧任务"
fi

# 添加新任务
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

if [ $? -eq 0 ]; then
    echo "✓ Cron任务设置成功"
    echo ""
    echo "当前任务:"
    echo "----------------------------------------"
    crontab -l | grep "premium_subscription_updater.js"
    echo "----------------------------------------"
    echo ""
    echo "任务详情:"
    echo "  - 执行时间: 每天 00:00, 06:00, 12:00, 18:00"
    echo "  - 查看日志: tail -f $LOG_FILE"
    echo "  - 查看任务: crontab -l"
    echo "  - 删除任务: crontab -l | grep -v 'premium_subscription_updater.js' | crontab -"
    echo ""
    echo "立即执行一次更新..."
    cd "$SCRIPT_DIR" && node "$UPDATE_SCRIPT"
    echo ""
    echo "✓ 设置完成!"
else
    echo "✗ Cron任务设置失败"
    exit 1
fi
