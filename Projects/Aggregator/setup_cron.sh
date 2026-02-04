#!/bin/bash
# 一键配置自动扫描 Cron 任务

echo "=========================================="
echo "  机场聚合器 - 自动扫描配置工具"
echo "=========================================="
echo ""

# 配置
PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
SCRIPT_PATH="$PROJECT_DIR/auto_scan.sh"

# 检查脚本是否存在
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ 错误: 找不到自动扫描脚本"
    echo "   路径: $SCRIPT_PATH"
    exit 1
fi

# 确保脚本有执行权限
chmod +x "$SCRIPT_PATH"
echo "✅ 脚本权限已设置"

# 显示菜单
echo ""
echo "请选择扫描频率:"
echo "1) 每 6 小时一次 (推荐)"
echo "2) 每 12 小时一次"
echo "3) 每天一次 (凌晨 3:00)"
echo "4) 每天两次 (凌晨 3:00 和下午 15:00)"
echo "5) 自定义"
echo "6) 查看当前配置"
echo "7) 删除自动扫描任务"
echo "0) 退出"
echo ""

read -p "请输入选项 [0-7]: " choice

case $choice in
    1)
        CRON_EXPR="0 */6 * * *"
        CRON_DESC="每6小时执行一次"
        ;;
    2)
        CRON_EXPR="0 */12 * * *"
        CRON_DESC="每12小时执行一次"
        ;;
    3)
        CRON_EXPR="0 3 * * *"
        CRON_DESC="每天凌晨3:00执行"
        ;;
    4)
        CRON_EXPR="0 3,15 * * *"
        CRON_DESC="每天凌晨3:00和下午15:00执行"
        ;;
    5)
        echo ""
        echo "Cron 表达式格式: 分 时 日 月 周"
        echo "示例: 0 */6 * * * (每6小时)"
        echo "      0 2,14 * * * (每天2:00和14:00)"
        read -p "请输入 Cron 表达式: " CRON_EXPR
        CRON_DESC="自定义: $CRON_EXPR"
        ;;
    6)
        echo ""
        echo "当前 Crontab 配置:"
        echo "----------------------------------------"
        crontab -l 2>/dev/null | grep -F "$SCRIPT_PATH" || echo "未找到相关任务"
        echo "----------------------------------------"
        echo ""
        read -p "按回车键继续..."
        exit 0
        ;;
    7)
        echo ""
        echo "正在删除自动扫描任务..."
        crontab -l 2>/dev/null | grep -v -F "$SCRIPT_PATH" | crontab -
        echo "✅ 任务已删除"
        echo ""
        exit 0
        ;;
    0)
        echo "退出配置"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

# 确认配置
echo ""
echo "=========================================="
echo "配置信息:"
echo "----------------------------------------"
echo "脚本路径: $SCRIPT_PATH"
echo "执行频率: $CRON_DESC"
echo "Cron 表达式: $CRON_EXPR"
echo "=========================================="
echo ""
read -p "确认添加此任务? [y/N]: " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 添加到 crontab
echo ""
echo "正在配置 Cron 任务..."

# 备份当前 crontab
crontab -l > /tmp/crontab.backup 2>/dev/null

# 删除旧的相同任务（如果存在）
crontab -l 2>/dev/null | grep -v -F "$SCRIPT_PATH" | crontab -

# 添加新任务
(crontab -l 2>/dev/null; echo "$CRON_EXPR $SCRIPT_PATH >> $PROJECT_DIR/logs/cron.log 2>&1") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron 任务配置成功！"
    echo ""
    echo "=========================================="
    echo "配置完成"
    echo "=========================================="
    echo ""
    echo "📋 任务信息:"
    echo "   执行频率: $CRON_DESC"
    echo "   脚本路径: $SCRIPT_PATH"
    echo ""
    echo "📁 日志文件:"
    echo "   任务日志: $PROJECT_DIR/logs/auto_scan.log"
    echo "   扫描日志: $PROJECT_DIR/logs/scan_output.log"
    echo "   Cron日志: $PROJECT_DIR/logs/cron.log"
    echo ""
    echo "🔍 查看日志:"
    echo "   tail -f $PROJECT_DIR/logs/auto_scan.log"
    echo ""
    echo "✅ 手动测试:"
    echo "   bash $SCRIPT_PATH"
    echo ""
    echo "📊 查看任务:"
    echo "   crontab -l"
    echo ""
    echo "=========================================="
    
    # 询问是否立即执行一次测试
    echo ""
    read -p "是否立即执行一次测试扫描? [y/N]: " test_run
    
    if [[ "$test_run" =~ ^[Yy]$ ]]; then
        echo ""
        echo "开始测试扫描..."
        echo "----------------------------------------"
        bash "$SCRIPT_PATH"
        echo "----------------------------------------"
        echo ""
        echo "✅ 测试完成，请查看日志文件确认结果"
    fi
else
    echo "❌ 配置失败"
    echo "正在恢复备份..."
    crontab /tmp/crontab.backup 2>/dev/null
    exit 1
fi

# 清理备份
rm -f /tmp/crontab.backup

echo ""
echo "配置完成！系统将按照设定的频率自动扫描节点。"
echo ""
