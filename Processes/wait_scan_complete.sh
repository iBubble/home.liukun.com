#!/bin/bash

# 等待扫描完成并显示结果

echo "=== 等待扫描完成 ==="
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

LOG_FILE="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log"
YAML_FILE="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator/data/clash.yaml"

# 等待进程结束
while ps aux | grep -E "collect.py.*--skip" | grep -v grep > /dev/null; do
    echo "⏳ 扫描进行中... $(date '+%H:%M:%S')"
    sleep 10
done

echo ""
echo "✅ 扫描已完成！"
echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 显示结果
if [ -f "$YAML_FILE" ]; then
    node_count=$(grep -c "^  - {name:" "$YAML_FILE" 2>/dev/null || echo "0")
    echo "📊 YAML文件节点数: $node_count"
fi

# 调用parse_nodes.py解析
echo ""
echo "🔄 解析节点..."
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
python3 parse_nodes.py

# 显示最终结果
JSON_FILE="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/nodes.json"
if [ -f "$JSON_FILE" ]; then
    final_count=$(cat "$JSON_FILE" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    echo ""
    echo "🎯 最终有效节点数: $final_count"
fi

echo ""
echo "=== 完成 ==="
