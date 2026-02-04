#!/bin/bash

echo "=========================================="
echo "优化的节点扫描测试（累加模式）"
echo "=========================================="

cd Projects/Aggregator/external/aggregator

# 备份旧数据
echo "[1] 备份旧数据..."
if [ -f "data/clash.yaml" ]; then
    old_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    echo "    当前节点数: $old_count"
    cp data/clash.yaml data/clash.yaml.backup
else
    old_count=0
    echo "    无旧数据"
fi

# 使用优化参数运行proxy_collect.py（不使用--overwrite，累加模式）
echo ""
echo "[2] 运行优化扫描（累加模式）..."
echo "    - 使用 --chuck 参数跳过需要人工认证的机场"
echo "    - 使用 --skip 跳过可用性检查（加快速度）"
echo "    - 使用 --pages 2 限制Telegram页面数"
echo "    - 使用 --num 200 使用200线程"
echo "    - 不使用 --overwrite，累加新节点"
echo ""

python3 proxy_collect.py \
    --chuck \
    --skip \
    --pages 2 \
    --num 200 \
    --targets clash \
    --all \
    2>&1 | tee ../../logs/test_optimized_scan.log

# 检查结果
echo ""
echo "[3] 检查结果..."
if [ -f "data/clash.yaml" ]; then
    new_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    added=$((new_count - old_count))
    echo "✓ 成功生成 clash.yaml"
    echo "✓ 原有节点: $old_count"
    echo "✓ 当前节点: $new_count"
    echo "✓ 新增节点: $added"
    
    # 显示节点类型分布
    echo ""
    echo "节点类型分布:"
    grep "^  - {name:" data/clash.yaml | grep -oP "type: \w+" | sort | uniq -c
    
    # 显示前10个节点
    echo ""
    echo "前10个节点预览:"
    grep "^  - {name:" data/clash.yaml | head -10 | sed 's/^  - {name: /  /'
else
    echo "✗ 未生成 clash.yaml"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
