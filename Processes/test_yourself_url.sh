#!/bin/bash
# 测试 --yourself 参数使用 HTTP URL

echo "=== 测试 --yourself 参数 ==="

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator

# 设置代理环境变量
export HTTP_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"
export HTTPS_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"

echo "代理: $HTTP_PROXY"
echo ""

# 测试访问订阅源列表
echo "测试访问订阅源列表:"
curl -s http://localhost/Projects/Aggregator/my_sources.txt | head -5
echo ""

# 执行扫描（限时60秒）
echo "=== 开始扫描（60秒超时）==="
timeout 60 python3 subscribe/collect.py --yourself "http://localhost/Projects/Aggregator/my_sources.txt" --skip --num 200 --targets clash 2>&1 | tail -50
