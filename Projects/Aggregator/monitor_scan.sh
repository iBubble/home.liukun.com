#!/bin/bash

echo "=========================================="
echo "  Aggregator 扫描进度监控"
echo "=========================================="
echo ""

# 检查扫描进程
SCAN_PID=$(ps aux | grep "collect.py" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$SCAN_PID" ]; then
    echo "❌ 没有正在运行的扫描任务"
    echo ""
    echo "启动新的扫描:"
    echo "  cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator"
    echo "  nohup python3 subscribe/collect.py --skip --overwrite --pages 5 --num 64 --targets clash > ../../logs/real_scan.log 2>&1 &"
    exit 1
fi

echo "✅ 扫描任务正在运行"
echo "   PID: $SCAN_PID"
echo "   开始时间: $(ps -p $SCAN_PID -o lstart= 2>/dev/null || echo '未知')"
echo "   运行时长: $(ps -p $SCAN_PID -o etime= 2>/dev/null || echo '未知')"
echo ""

# 检查日志文件
LOG_FILE="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log"

if [ -f "$LOG_FILE" ]; then
    echo "📊 最新日志 (最后 20 行):"
    echo "----------------------------------------"
    tail -20 "$LOG_FILE"
    echo "----------------------------------------"
    echo ""
fi

# 检查数据文件
DATA_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator/data"

echo "📁 数据文件状态:"
echo "----------------------------------------"
ls -lht "$DATA_DIR" | head -10
echo "----------------------------------------"
echo ""

# 统计节点数
if [ -f "$DATA_DIR/clash.yaml" ]; then
    NODE_COUNT=$(grep -c "name:" "$DATA_DIR/clash.yaml" 2>/dev/null || echo "0")
    echo "📡 当前节点数: $NODE_COUNT"
else
    echo "📡 当前节点数: 0 (clash.yaml 尚未生成)"
fi

echo ""
echo "💡 提示:"
echo "  - 实时查看日志: tail -f $LOG_FILE"
echo "  - 停止扫描: sudo kill $SCAN_PID"
echo "  - 完成后运行: python3 parse_nodes.py"
echo ""
