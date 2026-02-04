#!/bin/bash

echo "=== 测试扫描流程：验证从0开始 ==="
echo ""

# 1. 清空旧数据
echo "1. 清空旧数据..."
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
rm -f data/nodes.json data/scan_task.pid
echo "[]" > data/nodes.json
sudo chown www:www data/nodes.json
sudo chmod 666 data/nodes.json

# 2. 检查初始状态
echo ""
echo "2. 检查初始状态..."
INITIAL_COUNT=$(curl -s 'https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/status' | jq -r '.node_count')
echo "   初始节点数: $INITIAL_COUNT"

# 3. 启动扫描
echo ""
echo "3. 启动扫描..."
SCAN_RESULT=$(curl -s -X POST 'https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/scan' \
  -H 'Content-Type: application/json' \
  -d '{"proxy":{"enable":false}}')

echo "   扫描启动响应:"
echo "$SCAN_RESULT" | jq '.'

START_COUNT=$(echo "$SCAN_RESULT" | jq -r '.node_count')
echo ""
echo "   扫描开始时节点数: $START_COUNT"

# 4. 等待3秒后检查状态
echo ""
echo "4. 等待3秒后检查扫描状态..."
sleep 3

STATUS=$(curl -s 'https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/scan/status')
CURRENT_COUNT=$(echo "$STATUS" | jq -r '.node_count')
echo "   当前节点数: $CURRENT_COUNT"

# 5. 验证结果
echo ""
echo "=== 验证结果 ==="
if [ "$START_COUNT" = "0" ]; then
    echo "✅ 成功：扫描开始时节点数为0"
else
    echo "❌ 失败：扫描开始时节点数为 $START_COUNT，应该为0"
fi

if [ "$CURRENT_COUNT" -gt "0" ]; then
    echo "✅ 成功：扫描进行中，已发现 $CURRENT_COUNT 个节点"
else
    echo "⏳ 等待：扫描仍在进行中，暂无节点数据"
fi
