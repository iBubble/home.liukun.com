#!/bin/bash

# 测试 --refresh 模式（只更新已有订阅，不注册新机场）

echo "=== 测试 --refresh 模式 ==="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator

# 清理旧数据
echo "1. 清理旧数据..."
rm -f data/nodes.json
rm -f logs/real_scan.log
echo "[]" > data/nodes.json
chmod 666 data/nodes.json

# 检查订阅源文件
echo ""
echo "2. 检查订阅源文件..."
if [ -f "data/my_sources.txt" ]; then
    echo "订阅源文件存在，内容："
    cat data/my_sources.txt | grep -v "^#" | grep -v "^$"
else
    echo "错误: 订阅源文件不存在"
    exit 1
fi

# 检查config.json配置
echo ""
echo "3. 检查config.json配置..."
echo "crawl.enable = $(cat external/aggregator/subscribe/config/config.json | grep -A 1 '"crawl"' | grep '"enable"' | awk '{print $2}')"
echo "telegram.enable = $(cat external/aggregator/subscribe/config/config.json | grep -A 20 '"telegram"' | grep '"enable"' | head -1 | awk '{print $2}')"
echo "github.enable = $(cat external/aggregator/subscribe/config/config.json | grep -A 20 '"github"' | grep '"enable"' | head -1 | awk '{print $2}')"

# 执行扫描
echo ""
echo "4. 开始扫描（--refresh模式）..."
echo "命令: python3 subscribe/collect.py --skip --num 200 --targets clash --refresh --yourself data/my_sources.txt"
echo ""

cd external/aggregator
python3 subscribe/collect.py --skip --num 200 --targets clash --refresh --yourself ../../data/my_sources.txt 2>&1 | tee ../../logs/real_scan.log

# 检查结果
echo ""
echo "5. 检查扫描结果..."
cd ../..

if [ -f "external/aggregator/data/clash.yaml" ]; then
    node_count=$(grep -c "^  - name:" external/aggregator/data/clash.yaml || echo "0")
    echo "clash.yaml 节点数: $node_count"
    
    # 显示前5个节点名称
    echo ""
    echo "前5个节点："
    grep "^  - name:" external/aggregator/data/clash.yaml | head -5
else
    echo "错误: clash.yaml 不存在"
fi

# 检查日志中是否有机场爬取
echo ""
echo "6. 检查是否爬取了机场..."
if grep -q "start generate subscribes information, tasks: 899" logs/real_scan.log; then
    echo "警告: 仍在爬取899个机场！"
    echo "日志片段:"
    grep "start generate subscribes information" logs/real_scan.log
else
    echo "✓ 没有爬取机场"
    echo "任务数:"
    grep "start generate subscribes information" logs/real_scan.log || echo "未找到任务信息"
fi

echo ""
echo "=== 测试完成 ==="
