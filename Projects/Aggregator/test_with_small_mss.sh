#!/bin/bash

echo "========== 测试降低MSS =========="
echo ""

# 临时降低TCP MSS
echo "📝 设置TCP MSS为1200..."
sudo iptables -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1200

# 启动Clash
echo "🚀 启动Clash..."
lsof -ti:17899 | xargs kill -9 2>/dev/null
lsof -ti:17900 | xargs kill -9 2>/dev/null
sleep 2

./clash_bin/clash-linux-amd64 -d clash_bin -f clash_bin/test_no_tfo_config.yaml > /tmp/clash_mss_test.log 2>&1 &
CLASH_PID=$!
sleep 3

echo "✅ Clash已启动"
echo ""

# 测试HTTPS
echo "🔍 测试: 访问 https://www.google.com..."
timeout 15 curl -v -x http://127.0.0.1:17899 -k --connect-timeout 10 https://www.google.com 2>&1 | head -40

# 清理
echo ""
echo "🧹 清理规则..."
sudo iptables -t mangle -D POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1200 2>/dev/null

kill $CLASH_PID 2>/dev/null
wait $CLASH_PID 2>/dev/null

echo ""
echo "========== 测试完成 =========="
