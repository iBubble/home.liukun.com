#!/bin/bash
# 测试只使用GitHub等公开来源的扫描（不使用--all参数）

echo "=== 测试GitHub公开来源扫描 ==="
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

# 检查当前节点数
echo "2. 当前节点数: 0"
echo ""

# 运行扫描（不使用--all参数）
echo "3. 开始扫描（只使用GitHub和Telegram等公开来源）..."
cd external/aggregator
export PYTHONPATH=/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator

# 参照Mac App的方式：简单调用collect.py，依赖config.json配置
python3 subscribe/collect.py --skip --pages 2 --num 200 --targets clash 2>&1 | tee -a ../../logs/real_scan.log

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
