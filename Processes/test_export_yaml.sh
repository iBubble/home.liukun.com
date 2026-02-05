#!/bin/bash

# 测试YAML导出功能

echo "=========================================="
echo "测试YAML导出功能"
echo "=========================================="
echo ""

BASE_URL="https://home.liukun.com:8443/Projects/NodeLocalChecker"

# 1. 获取可用节点
echo "1. 获取可用节点..."
AVAILABLE_NODES=$(curl -s "${BASE_URL}/api/nodes.php?action=list" | jq '[.nodes[] | select(.available == 1)]')
COUNT=$(echo "$AVAILABLE_NODES" | jq 'length')
echo "可用节点数: $COUNT"
echo ""

if [ "$COUNT" -eq 0 ]; then
    echo "没有可用节点，无法测试导出功能"
    exit 1
fi

# 2. 导出YAML
echo "2. 导出YAML配置..."
YAML_FILE="/tmp/test_export_$(date +%Y%m%d_%H%M%S).yaml"

curl -s -X POST "${BASE_URL}/api/export.php" \
    -H "Content-Type: application/json" \
    -d "{\"nodes\": $AVAILABLE_NODES}" \
    -o "$YAML_FILE"

echo "YAML已保存到: $YAML_FILE"
echo ""

# 3. 检查YAML文件
echo "3. 检查YAML文件..."
FILE_SIZE=$(wc -c < "$YAML_FILE")
echo "文件大小: $FILE_SIZE 字节"
echo ""

# 4. 显示YAML内容（前50行）
echo "4. YAML内容预览（前50行）:"
echo "----------------------------------------"
head -50 "$YAML_FILE"
echo "----------------------------------------"
echo ""

# 5. 检查节点名称是否重复
echo "5. 检查节点名称是否重复..."
PROXY_NAMES=$(grep "^  - name:" "$YAML_FILE" | sed 's/.*name: //' | sort)
UNIQUE_NAMES=$(echo "$PROXY_NAMES" | uniq)
TOTAL_COUNT=$(echo "$PROXY_NAMES" | wc -l)
UNIQUE_COUNT=$(echo "$UNIQUE_NAMES" | wc -l)

echo "总节点数: $TOTAL_COUNT"
echo "唯一名称数: $UNIQUE_COUNT"

if [ "$TOTAL_COUNT" -eq "$UNIQUE_COUNT" ]; then
    echo "✅ 没有重复的节点名称"
else
    echo "❌ 发现重复的节点名称:"
    echo "$PROXY_NAMES" | uniq -d
fi
echo ""

# 6. 使用Clash验证配置（如果有clash命令）
if command -v clash &> /dev/null; then
    echo "6. 使用Clash验证配置..."
    clash -t -f "$YAML_FILE" 2>&1 | head -20
else
    echo "6. Clash命令不可用，跳过验证"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "YAML文件位置: $YAML_FILE"
echo "可以手动导入到Clash Verge测试"
