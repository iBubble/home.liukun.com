#!/bin/bash
# 最终扫描测试

echo "=== 最终扫描测试 ==="
echo "开始时间: $(date '+%H:%M:%S')"
echo ""

# 清空日志
> Projects/Aggregator/logs/real_scan.log
> Projects/Aggregator/logs/aggregator.log

# 运行扫描（后台）
echo "启动扫描..."
timeout 180 php Projects/Aggregator/scan.php > /dev/null 2>&1 &
SCAN_PID=$!

echo "扫描进程 PID: $SCAN_PID"
echo ""

# 等待并显示进度
for i in {1..36}; do
    if ! ps -p $SCAN_PID > /dev/null 2>&1; then
        echo "✓ 扫描进程已结束"
        break
    fi
    
    # 检查是否完成
    if grep -q "All artifact generated" Projects/Aggregator/logs/real_scan.log 2>/dev/null; then
        echo "✓ 扫描完成！"
        break
    fi
    
    echo -n "."
    sleep 5
done

echo ""
echo "结束时间: $(date '+%H:%M:%S')"
echo ""

# 显示结果
echo "=== 扫描结果 ==="
if [ -f Projects/Aggregator/data/nodes.json ]; then
    node_count=$(python3 -c "import json; data=json.load(open('Projects/Aggregator/data/nodes.json')); print(len(data))" 2>/dev/null || echo "0")
    echo "✓ 有效节点数: $node_count"
else
    echo "✗ 节点文件不存在"
fi

echo ""
echo "=== 日志摘要 ==="
echo "GitHub 相关:"
grep -i "github" Projects/Aggregator/logs/real_scan.log 2>/dev/null | head -5 || echo "无"
echo ""
echo "yourself 相关:"
grep -i "yourself" Projects/Aggregator/logs/real_scan.log 2>/dev/null | head -5 || echo "无"
echo ""
echo "found proxies:"
grep "found.*proxies" Projects/Aggregator/logs/real_scan.log 2>/dev/null | tail -1 || echo "无"
