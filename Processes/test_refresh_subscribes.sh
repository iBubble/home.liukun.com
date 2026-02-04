#!/bin/bash
# 测试刷新订阅功能

echo "=== 测试刷新订阅 ==="
echo "开始时间: $(date '+%H:%M:%S')"
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator

# 设置代理环境变量
export HTTP_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"
export HTTPS_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"

echo "代理: $HTTP_PROXY"
echo ""

# 显示订阅源
echo "订阅源列表:"
cat data/subscribes.txt
echo ""

# 执行刷新（限时60秒）
echo "=== 开始刷新订阅（60秒超时）==="
timeout 60 python3 subscribe/collect.py --refresh --skip --num 200 --targets clash 2>&1 | tail -50

echo ""
echo "结束时间: $(date '+%H:%M:%S')"
echo ""

# 检查结果
if [ -f data/clash.yaml ]; then
    echo "=== clash.yaml 生成成功 ==="
    echo "文件大小: $(wc -c < data/clash.yaml) 字节"
    echo "节点数量: $(grep -c "^  - name:" data/clash.yaml || echo 0)"
else
    echo "✗ clash.yaml 未生成"
fi
