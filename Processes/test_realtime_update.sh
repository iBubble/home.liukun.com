#!/bin/bash
# 测试实时节点更新功能

echo "=========================================="
echo "测试实时节点更新功能"
echo "=========================================="

PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
DATA_DIR="$PROJECT_DIR/data"
NODES_FILE="$DATA_DIR/nodes.json"

# 清理旧任务
echo ""
echo "1. 清理旧任务..."
sudo pkill -f "proxy_collect.py" 2>/dev/null
sudo pkill -f "collect.py" 2>/dev/null
sudo pkill -f "monitor_scan.php" 2>/dev/null
rm -f "$DATA_DIR/scan_task.pid"
sleep 2
echo "✓ 清理完成"

# 记录初始节点数
INITIAL_COUNT=0
if [ -f "$NODES_FILE" ]; then
    INITIAL_COUNT=$(jq '. | length' "$NODES_FILE" 2>/dev/null || echo "0")
fi
echo ""
echo "2. 初始节点数: $INITIAL_COUNT"

# 启动扫描任务
echo ""
echo "3. 启动扫描任务..."
SCAN_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
    -d '{"proxy":{"enable":true,"type":"socks5","host":"us.liukun.com","port":"1080","username":"Gemini","password":"Gl5181081"}}' \
    "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/scan" \
    -k -s 2>&1 | grep -o '{"success.*}')

if echo "$SCAN_RESPONSE" | grep -q '"success":true'; then
    echo "✓ 扫描任务已启动"
else
    echo "✗ 扫描任务启动失败"
    echo "$SCAN_RESPONSE"
    exit 1
fi

# 监控节点数变化
echo ""
echo "4. 监控节点数变化（每3秒检查一次，最多60秒）..."
echo "时间    节点数  变化"
echo "----------------------------"

LAST_COUNT=$INITIAL_COUNT
for i in {1..20}; do
    sleep 3
    
    if [ -f "$NODES_FILE" ]; then
        CURRENT_COUNT=$(jq '. | length' "$NODES_FILE" 2>/dev/null || echo "0")
    else
        CURRENT_COUNT=0
    fi
    
    CHANGE=$((CURRENT_COUNT - LAST_COUNT))
    if [ $CHANGE -gt 0 ]; then
        printf "%2ds     %3d     +%d ✓\n" $((i*3)) $CURRENT_COUNT $CHANGE
    else
        printf "%2ds     %3d     --\n" $((i*3)) $CURRENT_COUNT
    fi
    
    LAST_COUNT=$CURRENT_COUNT
    
    # 检查扫描任务是否还在运行
    if [ ! -f "$DATA_DIR/scan_task.pid" ]; then
        echo ""
        echo "扫描任务已完成"
        break
    fi
done

# 最终统计
echo ""
echo "=========================================="
echo "测试结果"
echo "=========================================="
echo "初始节点数: $INITIAL_COUNT"
echo "最终节点数: $CURRENT_COUNT"
echo "新增节点数: $((CURRENT_COUNT - INITIAL_COUNT))"
echo ""

if [ $CURRENT_COUNT -gt $INITIAL_COUNT ]; then
    echo "✓ 实时更新功能正常工作"
else
    echo "✗ 节点数未增加，可能存在问题"
fi

# 检查监控日志
echo ""
echo "监控日志（最后10行）："
echo "----------------------------"
tail -10 "$PROJECT_DIR/logs/monitor.log" 2>/dev/null || echo "无监控日志"
