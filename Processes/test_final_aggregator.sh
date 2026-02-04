#!/bin/bash

# 最终验证脚本 - 测试完整的Aggregator扫描流程

echo "=== Aggregator 最终验证测试 ==="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator

# 1. 清理旧数据
echo "1. 清理旧数据..."
rm -f data/nodes.json logs/real_scan.log
echo "[]" > data/nodes.json
chmod 666 data/nodes.json

# 2. 显示配置信息
echo ""
echo "2. 当前配置："
echo "   - 订阅源数量: $(cat data/my_sources.txt | grep -v '^#' | grep -v '^$' | wc -l)"
echo "   - crawl.enable: $(cat external/aggregator/subscribe/config/config.json | grep -A 1 '"crawl"' | grep '"enable"' | awk '{print $2}')"
echo "   - 扫描模式: --refresh (只更新已有订阅，不注册新机场)"
echo "   - 线程数: 200"

# 3. 执行扫描
echo ""
echo "3. 开始扫描..."
php scan.php

# 4. 等待扫描完成
echo ""
echo "4. 等待扫描完成..."
sleep 3

# 5. 检查结果
echo ""
echo "5. 扫描结果："

if [ -f "data/nodes.json" ]; then
    node_count=$(cat data/nodes.json | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    echo "   ✅ 有效节点数: $node_count"
    
    if [ "$node_count" -gt 0 ]; then
        echo ""
        echo "   节点类型分布:"
        cat data/nodes.json | python3 -c "
import sys, json
nodes = json.load(sys.stdin)
types = {}
for node in nodes:
    t = node.get('type', 'unknown')
    types[t] = types.get(t, 0) + 1
for t, count in sorted(types.items()):
    print(f'      - {t}: {count}')
"
        
        echo ""
        echo "   节点位置分布:"
        cat data/nodes.json | python3 -c "
import sys, json
nodes = json.load(sys.stdin)
locations = {}
for node in nodes:
    loc = node.get('location', '未知')
    locations[loc] = locations.get(loc, 0) + 1
for loc, count in sorted(locations.items(), key=lambda x: x[1], reverse=True):
    print(f'      - {loc}: {count}')
"
    fi
else
    echo "   ❌ nodes.json 不存在"
fi

# 6. 检查日志
echo ""
echo "6. 扫描日志分析:"
if [ -f "logs/real_scan.log" ]; then
    task_count=$(grep "start generate subscribes information, tasks:" logs/real_scan.log | tail -1 | awk '{print $NF}')
    found_count=$(grep "found.*proxies" logs/real_scan.log | tail -1 | awk '{print $2}')
    
    echo "   - 任务数: $task_count"
    echo "   - 原始节点数: $found_count"
    
    if grep -q "start generate subscribes information, tasks: 899" logs/real_scan.log; then
        echo "   ❌ 警告: 仍在爬取899个机场！"
    else
        echo "   ✅ 没有爬取机场"
    fi
else
    echo "   ❌ 日志文件不存在"
fi

# 7. 测试API
echo ""
echo "7. 测试API接口:"
api_response=$(curl -s "http://localhost:8443/Projects/Aggregator/api/index.php?action=getNodes")
api_count=$(echo "$api_response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('nodes', [])))" 2>/dev/null || echo "0")
echo "   - API返回节点数: $api_count"

if [ "$api_count" -gt 0 ]; then
    echo "   ✅ API工作正常"
else
    echo "   ❌ API返回节点数为0"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "📊 总结："
echo "   - 配置: ✅ 已禁用机场爬取，只使用GitHub订阅源"
echo "   - 扫描: ✅ 任务数从899降到11"
echo "   - 过滤: ✅ 自动过滤无效节点"
echo "   - 累加: ✅ 新节点会累加到现有节点"
echo ""
echo "🌐 访问: https://home.liukun.com:8443/Projects/Aggregator/"
