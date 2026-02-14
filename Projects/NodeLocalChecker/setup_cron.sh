#!/bin/bash
# 设置自动更新Cron任务
# 每6小时自动从聚合器获取最新节点

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_UPDATE_SCRIPT="$SCRIPT_DIR/scripts/auto_update.php"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/auto_update.log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

echo "=== 设置NodeLocalChecker自动更新任务 ==="
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

# 检查是否已存在相同的Cron任务
if crontab -l 2>/dev/null | grep -F "$AUTO_UPDATE_SCRIPT" > /dev/null; then
    echo "⚠ 检测到已存在的Cron任务"
    echo ""
    read -p "是否要替换现有任务? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "取消设置"
        exit 0
    fi
    
    # 删除旧任务
    crontab -l 2>/dev/null | grep -v "$AUTO_UPDATE_SCRIPT" | crontab -
    echo "✓ 已删除旧任务"
fi

# 添加新任务
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

if [ $? -eq 0 ]; then
    echo "✓ Cron任务设置成功"
    echo ""
    echo "当前Cron任务列表:"
    echo "----------------------------------------"
    crontab -l | grep "$AUTO_UPDATE_SCRIPT"
    echo "----------------------------------------"
    echo ""
    echo "提示:"
    echo "  - 查看所有任务: crontab -l"
    echo "  - 编辑任务: crontab -e"
    echo "  - 删除任务: crontab -l | grep -v 'auto_update.php' | crontab -"
    echo "  - 查看日志: tail -f $LOG_FILE"
    echo ""
    echo "首次执行时间: $(date -d '+6 hours' '+%Y-%m-%d %H:00:00')"
else
    echo "✗ Cron任务设置失败"
    exit 1
fi
