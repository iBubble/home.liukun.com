#!/bin/bash

echo "========== 测试简单HTTP访问 =========="
echo ""

# 启动Clash
echo "🚀 启动Clash..."
./clash_bin/clash-linux-amd64 -d clash_bin -f clash_bin/test_no_tfo_config.yaml > /tmp/clash_test.log 2>&1 &
CLASH_PID=$!

sleep 3

echo "✅ Clash已启动 (PID: $CLASH_PID)"
echo ""

# 测试1: 直接访问代理服务器（不通过Clash）
echo "🔍 测试1: 直接连接代理服务器..."
timeout 5 nc -zv 152.53.131.209 8443
echo ""

# 测试2: 通过Clash访问HTTP网站
echo "🔍 测试2: 通过Clash访问 http://example.com..."
curl -v -x http://127.0.0.1:17899 --connect-timeout 10 --max-time 20 http://example.com 2>&1 | head -30
echo ""

# 测试3: 通过Clash访问HTTPS网站
echo "🔍 测试3: 通过Clash访问 https://www.google.com..."
curl -v -x http://127.0.0.1:17899 -k --connect-timeout 10 --max-time 20 https://www.google.com 2>&1 | head -30
echo ""

# 停止Clash
echo "🛑 停止Clash..."
kill $CLASH_PID 2>/dev/null
wait $CLASH_PID 2>/dev/null

echo ""
echo "========== 测试完成 =========="
