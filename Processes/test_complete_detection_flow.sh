#!/bin/bash

# 完整检测流程测试脚本
# 测试: 导入 -> 检测 -> 保存 -> 刷新 -> 验证数据持久化

echo "=========================================="
echo "NodeLocalChecker 完整流程测试"
echo "=========================================="
echo ""

BASE_URL="https://home.liukun.com:8443/Projects/NodeLocalChecker"
DATA_FILE="/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/data/nodes.json"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 备份当前数据
echo "1. 备份当前数据..."
if [ -f "$DATA_FILE" ]; then
    cp "$DATA_FILE" "${DATA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ 数据已备份${NC}"
else
    echo -e "${YELLOW}⚠ 数据文件不存在，跳过备份${NC}"
fi
echo ""

# 2. 检查当前节点数量
echo "2. 检查当前节点数量..."
CURRENT_COUNT=$(curl -s "${BASE_URL}/api/nodes.php?action=list" | jq '.nodes | length')
echo "当前节点数: $CURRENT_COUNT"
echo ""

# 3. 检查已检测节点数量
echo "3. 检查已检测节点数量..."
CHECKED_COUNT=$(curl -s "${BASE_URL}/api/nodes.php?action=list" | jq '[.nodes[] | select(.available != null)] | length')
echo "已检测节点数: $CHECKED_COUNT"
echo ""

# 4. 查看前5个节点的检测状态
echo "4. 查看前5个节点的检测状态..."
curl -s "${BASE_URL}/api/nodes.php?action=list" | jq -r '.nodes[0:5] | .[] | "\(.name): available=\(.available), latency=\(.latency), real_ip=\(.real_ip), purity_score=\(.ip_purity_score)"'
echo ""

# 5. 测试单个节点检测
echo "5. 测试单个节点检测..."
echo "获取第一个未检测的节点..."
FIRST_UNCHECKED=$(curl -s "${BASE_URL}/api/nodes.php?action=list" | jq -c '.nodes[] | select(.available == null) | {name, type, server, port, node_hash, raw}' | head -1)

if [ -z "$FIRST_UNCHECKED" ]; then
    echo -e "${YELLOW}⚠ 没有未检测的节点${NC}"
else
    NODE_NAME=$(echo "$FIRST_UNCHECKED" | jq -r '.name')
    NODE_HASH=$(echo "$FIRST_UNCHECKED" | jq -r '.node_hash')
    echo "节点名称: $NODE_NAME"
    echo "节点哈希: $NODE_HASH"
    echo ""
    
    echo "开始检测..."
    CHECK_RESULT=$(curl -s -X POST "${BASE_URL}/api/check.php" \
        -H "Content-Type: application/json" \
        -d "{\"node\": $FIRST_UNCHECKED}")
    
    echo "检测结果:"
    echo "$CHECK_RESULT" | jq '.'
    echo ""
    
    # 提取检测结果
    AVAILABLE=$(echo "$CHECK_RESULT" | jq -r '.available')
    LATENCY=$(echo "$CHECK_RESULT" | jq -r '.latency')
    REAL_IP=$(echo "$CHECK_RESULT" | jq -r '.real_ip')
    PURITY=$(echo "$CHECK_RESULT" | jq -c '.purity')
    
    if [ "$AVAILABLE" = "true" ]; then
        echo -e "${GREEN}✓ 节点可用${NC}"
        echo "延迟: $LATENCY"
        echo "真实IP: $REAL_IP"
        echo "纯净度: $PURITY"
    else
        echo -e "${YELLOW}⚠ 节点不可用（这是正常的，我们继续测试保存功能）${NC}"
    fi
    echo ""
    
    # 6. 测试保存检测结果（无论节点是否可用）
    echo "6. 测试保存检测结果..."
    
    # 处理null值
    if [ "$REAL_IP" = "null" ] || [ -z "$REAL_IP" ]; then
        REAL_IP_JSON="null"
    else
        REAL_IP_JSON="\"$REAL_IP\""
    fi
    
    if [ "$PURITY" = "null" ] || [ -z "$PURITY" ]; then
        PURITY_JSON="null"
    else
        PURITY_JSON="$PURITY"
    fi
    
    SAVE_DATA=$(jq -n \
        --argjson available "$AVAILABLE" \
        --arg latency "$LATENCY" \
        "{available: \$available, latency: \$latency, real_ip: $REAL_IP_JSON, purity: $PURITY_JSON}")
    
    echo "保存数据:"
    echo "$SAVE_DATA" | jq '.'
    
    SAVE_RESULT=$(curl -s -X POST "${BASE_URL}/api/nodes.php?action=update_check" \
        -H "Content-Type: application/json" \
        -d "{\"node_hash\": \"$NODE_HASH\", \"result\": $SAVE_DATA}")
    
    echo "保存结果:"
    echo "$SAVE_RESULT" | jq '.'
    echo ""
    
    # 7. 验证数据是否保存成功
    echo "7. 验证数据是否保存成功..."
    sleep 1
    SAVED_NODE=$(curl -s "${BASE_URL}/api/nodes.php?action=list" | jq ".nodes[] | select(.node_hash == \"$NODE_HASH\")")
    
    echo "保存后的节点数据:"
    echo "$SAVED_NODE" | jq '{name, available, latency, real_ip, ip_purity_score, last_check_time}'
    echo ""
    
    SAVED_AVAILABLE=$(echo "$SAVED_NODE" | jq -r '.available')
    SAVED_CHECK_TIME=$(echo "$SAVED_NODE" | jq -r '.last_check_time')
    
    # 验证逻辑
    EXPECTED_AVAILABLE="0"
    if [ "$AVAILABLE" = "true" ]; then
        EXPECTED_AVAILABLE="1"
    fi
    
    if [ "$SAVED_AVAILABLE" = "$EXPECTED_AVAILABLE" ] && [ "$SAVED_CHECK_TIME" != "null" ]; then
        echo -e "${GREEN}✓✓✓ 数据保存成功并验证通过！${NC}"
        echo "  - available: $SAVED_AVAILABLE (期望: $EXPECTED_AVAILABLE)"
        echo "  - last_check_time: $SAVED_CHECK_TIME"
    else
        echo -e "${RED}✗✗✗ 数据保存失败或不匹配！${NC}"
        echo "  - 期望 available: $EXPECTED_AVAILABLE"
        echo "  - 实际 available: $SAVED_AVAILABLE"
        echo "  - last_check_time: $SAVED_CHECK_TIME"
    fi
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
