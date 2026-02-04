#!/bin/bash

echo "=========================================="
echo "测试直接订阅源"
echo "=========================================="

cd Projects/Aggregator/external/aggregator

# 清空旧数据
echo "[1] 清空旧数据..."
rm -f data/clash.yaml data/nodes.json

# 使用直接订阅源（不爬取机场）
echo "[2] 使用直接订阅源获取节点..."
echo "    - 从GitHub已聚合的订阅源获取"
echo "    - 不爬取需要注册的机场"
echo ""

# 直接下载几个高质量的聚合订阅源
echo "正在下载订阅源..."

# 创建临时目录
mkdir -p temp_subs

# 下载多个订阅源
curl -s "https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt" > temp_subs/source1.txt
curl -s "https://raw.githubusercontent.com/freefq/free/master/v2" > temp_subs/source2.txt
curl -s "https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2" > temp_subs/source3.txt

# 合并所有订阅
cat temp_subs/*.txt > temp_subs/combined.txt

# 使用subconverter转换（如果有的话）或直接使用collect.py处理
echo ""
echo "[3] 处理订阅源..."

# 使用collect.py但不爬取，只处理已有的订阅
python3 subscribe/collect.py \
    --skip \
    --overwrite \
    --num 200 \
    --targets clash \
    2>&1 | tee ../../logs/test_direct_sources.log

# 检查结果
echo ""
echo "[4] 检查结果..."
if [ -f "data/clash.yaml" ]; then
    node_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    echo "✓ 成功生成 clash.yaml"
    echo "✓ 节点数量: $node_count"
    
    # 显示前10个节点
    echo ""
    echo "前10个节点预览:"
    grep "^  - {name:" data/clash.yaml | head -10
else
    echo "✗ 未生成 clash.yaml"
fi

# 清理临时文件
rm -rf temp_subs

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
