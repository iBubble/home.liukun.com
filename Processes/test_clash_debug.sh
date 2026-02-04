#!/bin/bash
# 调试 Clash 检测

echo "=== Clash 调试测试 ==="
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker

# 创建测试配置
cat > /tmp/test_clash_config.yaml << 'EOF'
port: 17890
socks-port: 17891
allow-lan: false
mode: rule
log-level: info
proxies:
  - name: US-美国
    type: vless
    server: 136.175.178.165
    port: 443
    uuid: e283ae94-ba73-478c-9498-796193972d43
    network: tcp
    tls: true
    servername: navi.bankrate.com
    reality-opts:
      public-key: UT9tFQOdy54SeW_tg-XQN3QkGYoWUpO_88XFXijkrXc
      short-id: 2da72ce6
    client-fingerprint: chrome
    tfo: true
    skip-cert-verify: true
proxy-groups:
  - name: test
    type: select
    proxies:
      - US-美国
rules:
  - MATCH,test
EOF

echo "1. 启动 Clash..."
mkdir -p /tmp/clash_test
./bin/clash -f /tmp/test_clash_config.yaml -d /tmp/clash_test &
CLASH_PID=$!

echo "Clash PID: $CLASH_PID"
sleep 5

echo ""
echo "2. 检查 Clash 是否运行..."
if ps -p $CLASH_PID > /dev/null; then
    echo "✓ Clash 正在运行"
else
    echo "✗ Clash 已停止"
    exit 1
fi

echo ""
echo "3. 测试通过 Clash 访问 Google..."
curl -x http://127.0.0.1:17890 \
    --max-time 10 \
    -I http://www.google.com/generate_204 \
    2>&1

echo ""
echo "4. 停止 Clash..."
kill $CLASH_PID 2>/dev/null
wait $CLASH_PID 2>/dev/null

echo ""
echo "5. 清理..."
rm -f /tmp/test_clash_config.yaml
rm -rf /tmp/clash_test

echo ""
echo "=== 测试完成 ==="
