#!/bin/bash
# 测试新的扫描命令

echo "=== 测试新的扫描命令 ==="

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator

# 设置代理环境变量
export HTTP_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"
export HTTPS_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"

echo "代理: $HTTP_PROXY"
echo ""

# 读取订阅源
sources=(
    "https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt"
    "https://raw.githubusercontent.com/freefq/free/master/v2"
)

# 构建命令
cmd="python3 subscribe/collect.py"
for source in "${sources[@]}"; do
    cmd="$cmd --sub '$source'"
done
cmd="$cmd --skip --num 200 --targets clash"

echo "命令: $cmd"
echo ""
echo "=== 开始测试（30秒超时）==="

# 执行命令（限时30秒）
timeout 30 bash -c "$cmd" 2>&1 | head -50
