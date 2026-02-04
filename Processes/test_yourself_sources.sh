#!/bin/bash
# 测试使用 --yourself 参数指定GitHub订阅源

echo "=== 测试使用自定义订阅源列表 ==="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator

# 清空旧数据
echo "1. 清空旧数据..."
rm -f data/nodes.json
echo "[]" > data/nodes.json
chmod 666 data/nodes.json

# 清空日志
echo "" > logs/real_scan.log
chmod 666 logs/real_scan.log

# 检查订阅源文件
echo "2. 检查订阅源文件..."
if [ -f data/my_sources.txt ]; then
    echo "   订阅源文件存在"
    echo "   订阅源数量: $(grep -v '^#' data/my_sources.txt | grep -v '^$' | wc -l)"
else
    echo "   ❌ 订阅源文件不存在！"
    exit 1
fi

echo ""
echo "3. 开始扫描（使用 --yourself 参数）..."
cd external/aggregator
export PYTHONPATH=/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator

# 使用 --yourself 参数指定订阅源列表
python3 subscribe/collect.py --skip --num 200 --targets clash --yourself ../../data/my_sources.txt 2>&1 | tee -a ../../logs/real_scan.log

echo ""
echo "4. 扫描完成，解析节点..."
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
python3 parse_nodes.py

echo ""
echo "5. 最终节点数:"
if [ -f data/nodes.json ]; then
    node_count=$(python3 -c "import json; data=json.load(open('data/nodes.json')); print(len(data))")
    echo "   节点总数: $node_count"
else
    echo "   nodes.json 不存在"
fi

echo ""
echo "=== 测试完成 ==="
