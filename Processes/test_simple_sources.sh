#!/bin/bash

echo "=========================================="
echo "使用指定订阅源测试（最简单方式）"
echo "=========================================="

cd Projects/Aggregator/external/aggregator

# 备份当前数据
echo "[1] 备份当前数据..."
if [ -f "data/clash.yaml" ]; then
    old_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    echo "    当前节点数: $old_count"
    cp data/clash.yaml data/clash.yaml.backup
else
    old_count=0
    echo "    无旧数据"
fi

# 使用--yourself参数指定我们自己的订阅源列表
echo ""
echo "[2] 使用指定的GitHub订阅源..."
echo "    - 只使用高质量的GitHub聚合订阅"
echo "    - 不爬取需要注册的机场"
echo "    - 使用200线程快速处理"
echo ""

python3 subscribe/collect.py \
    --yourself "../../data/my_sources.txt" \
    --skip \
    --num 200 \
    --targets clash \
    2>&1 | tee ../../logs/test_simple_sources.log

# 检查结果
echo ""
echo "[3] 检查结果..."
if [ -f "data/clash.yaml" ]; then
    new_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    added=$((new_count - old_count))
    echo "✓ 原有节点: $old_count"
    echo "✓ 当前节点: $new_count"
    echo "✓ 新增节点: $added"
    
    # 显示节点类型分布
    echo ""
    echo "节点类型分布:"
    grep "type:" data/clash.yaml | grep -oP "type: \w+" | sort | uniq -c
    
    # 显示前10个节点
    echo ""
    echo "前10个节点预览:"
    grep "^  - {name:" data/clash.yaml | head -10 | sed 's/^  - {name: /  /' | cut -d',' -f1
else
    echo "✗ 未生成 clash.yaml"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
