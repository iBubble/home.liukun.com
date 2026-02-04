#!/bin/bash

echo "=========================================="
echo "快速测试：只使用自定义订阅源"
echo "=========================================="

cd Projects/Aggregator/external/aggregator

# 备份
if [ -f "data/clash.yaml" ]; then
    cp data/clash.yaml data/clash.yaml.backup
fi

echo ""
echo "[1] 测试自定义订阅源（不爬取机场）"
echo "----------------------------------------"

python3 subscribe/collect.py \
    --yourself "../../data/my_sources.txt" \
    --skip \
    --num 200 \
    --targets clash \
    2>&1 | tee ../../logs/test_quick.log

echo ""
echo "[2] 检查结果"
echo "----------------------------------------"

if [ -f "data/clash.yaml" ]; then
    node_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    echo "✓ 生成节点数: $node_count"
    
    if [ $node_count -gt 0 ]; then
        echo ""
        echo "前10个节点:"
        grep "^  - {name:" data/clash.yaml | head -10 | sed 's/^  - {name: /  /' | cut -d',' -f1
    fi
else
    echo "✗ 未生成 clash.yaml"
fi

echo ""
echo "=========================================="
