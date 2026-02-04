#!/bin/bash

echo "=========================================="
echo "测试新配置的节点获取"
echo "=========================================="

cd Projects/Aggregator/external/aggregator

# 清空旧数据
echo "[1] 清空旧数据..."
rm -f data/clash.yaml data/nodes.json logs/real_scan.log

# 运行collect.py
echo "[2] 运行collect.py获取节点..."
echo "    - 使用简化配置（只启用GitHub和Telegram）"
echo "    - 禁用了Google、Yandex、Twitter等慢速来源"
echo ""

python3 subscribe/collect.py \
    --skip \
    --overwrite \
    --pages 2 \
    --num 200 \
    --targets clash \
    --all \
    2>&1 | tee ../../logs/test_new_config.log

# 检查结果
echo ""
echo "[3] 检查结果..."
if [ -f "data/clash.yaml" ]; then
    node_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    echo "✓ 成功生成 clash.yaml"
    echo "✓ 节点数量: $node_count"
    
    # 显示前5个节点
    echo ""
    echo "前5个节点预览:"
    grep "^  - {name:" data/clash.yaml | head -5
else
    echo "✗ 未生成 clash.yaml"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
