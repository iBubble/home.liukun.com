#!/bin/bash
# Aggregator 完整功能测试脚本

echo "=========================================="
echo "Aggregator 完整功能测试"
echo "=========================================="
echo ""

BASE_URL="https://home.liukun.com:8443/Projects/Aggregator"
API_URL="$BASE_URL/api/index.php"

# 1. 测试状态API
echo "1. 测试状态API..."
STATUS=$(curl -s "$API_URL?path=/status")
NODE_COUNT=$(echo "$STATUS" | jq -r '.node_count')
VERIFIED_COUNT=$(echo "$STATUS" | jq -r '.verified_count')
echo "   节点数: $NODE_COUNT"
echo "   已验证: $VERIFIED_COUNT"
if [ "$NODE_COUNT" -gt 0 ]; then
    echo "   ✅ 状态API正常"
else
    echo "   ❌ 状态API异常"
    exit 1
fi
echo ""

# 2. 测试节点列表API
echo "2. 测试节点列表API..."
NODES=$(curl -s "$API_URL?path=/nodes")
NODES_COUNT=$(echo "$NODES" | jq -r '.nodes | length')
echo "   返回节点数: $NODES_COUNT"
if [ "$NODES_COUNT" -eq "$NODE_COUNT" ]; then
    echo "   ✅ 节点列表API正常"
else
    echo "   ⚠️  节点数不一致"
fi
echo ""

# 3. 测试验证API
echo "3. 测试验证API..."
VERIFY=$(curl -s -X POST "$API_URL?path=/verify" -H "Content-Type: application/json" -d '{"speed_timeout": 3000}')
VERIFY_SUCCESS=$(echo "$VERIFY" | jq -r '.success')
VERIFY_COUNT=$(echo "$VERIFY" | jq -r '.verified_count')
echo "   验证结果: $VERIFY_SUCCESS"
echo "   可用节点: $VERIFY_COUNT"
if [ "$VERIFY_SUCCESS" = "true" ]; then
    echo "   ✅ 验证API正常"
else
    echo "   ❌ 验证API异常"
    echo "$VERIFY" | jq '.'
    exit 1
fi
echo ""

# 4. 测试代理配置
echo "4. 测试代理配置..."
if [ -f "Projects/Aggregator/data/proxy_config.json" ]; then
    PROXY_HOST=$(jq -r '.host' Projects/Aggregator/data/proxy_config.json)
    PROXY_PORT=$(jq -r '.port' Projects/Aggregator/data/proxy_config.json)
    echo "   代理地址: $PROXY_HOST:$PROXY_PORT"
    echo "   ✅ 代理配置存在"
else
    echo "   ⚠️  代理配置不存在"
fi
echo ""

# 5. 测试权限
echo "5. 测试文件权限..."
DATA_DIR_PERM=$(stat -c "%a" Projects/Aggregator/data)
NODES_PERM=$(stat -c "%a" Projects/Aggregator/data/nodes.json)
NODES_OWNER=$(stat -c "%U:%G" Projects/Aggregator/data/nodes.json)
echo "   data目录权限: $DATA_DIR_PERM"
echo "   nodes.json权限: $NODES_PERM"
echo "   nodes.json所有者: $NODES_OWNER"
if [ "$NODES_OWNER" = "www:www" ] && [ "$NODES_PERM" = "666" ]; then
    echo "   ✅ 权限配置正确"
else
    echo "   ⚠️  权限需要修复"
fi
echo ""

# 6. 测试数据一致性
echo "6. 测试数据一致性..."
JSON_COUNT=$(jq '. | length' Projects/Aggregator/data/nodes.json)
YAML_COUNT=$(grep -c "^  - {name:" Projects/Aggregator/external/aggregator/data/clash.yaml 2>/dev/null || echo "0")
echo "   JSON节点数: $JSON_COUNT"
echo "   YAML节点数: $YAML_COUNT"
echo "   API节点数: $NODE_COUNT"
if [ "$JSON_COUNT" -eq "$NODE_COUNT" ]; then
    echo "   ✅ 数据一致性正常"
else
    echo "   ⚠️  数据不一致"
fi
echo ""

# 7. 测试cron任务
echo "7. 测试cron任务..."
CRON_COUNT=$(crontab -l | grep -c "aggregator\|Aggregator")
echo "   已配置的cron任务: $CRON_COUNT"
if [ "$CRON_COUNT" -ge 2 ]; then
    echo "   ✅ Cron任务已配置"
    crontab -l | grep -E "(aggregator|Aggregator)"
else
    echo "   ⚠️  Cron任务配置不完整"
fi
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "访问地址: $BASE_URL/"
echo ""
