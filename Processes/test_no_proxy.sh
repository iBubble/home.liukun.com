#!/bin/bash
# 测试不使用任何代理的节点检测

echo "=== 测试无代理节点检测 ==="
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker

# 确保没有代理环境变量
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy
unset ALL_PROXY
unset all_proxy

echo "1. 检查环境变量（应该没有代理）..."
env | grep -i proxy || echo "✓ 没有代理环境变量"
echo ""

echo "2. 检查 Clash 核心..."
if [ -f "bin/clash" ]; then
    echo "✓ Clash 核心存在"
    ./bin/clash -v
else
    echo "✗ Clash 核心不存在"
    exit 1
fi
echo ""

echo "3. 测试节点（从 YAML 提取第一个节点）..."
NODE_JSON='{
    "name": "US-美国",
    "type": "vless",
    "server": "136.175.178.165",
    "port": 443,
    "uuid": "e283ae94-ba73-478c-9498-796193972d43",
    "network": "tcp",
    "tls": true,
    "servername": "navi.bankrate.com",
    "reality-opts": {
        "public-key": "UT9tFQOdy54SeW_tg-XQN3QkGYoWUpO_88XFXijkrXc",
        "short-id": "2da72ce6"
    },
    "client-fingerprint": "chrome",
    "tfo": true,
    "skip-cert-verify": true
}'

echo "节点信息: US-美国 (136.175.178.165:443)"
echo ""

echo "4. 执行 Python 检测脚本..."
python3 scripts/check_node_clash.py "$NODE_JSON" "$(pwd)/bin/clash"

echo ""
echo "=== 测试完成 ==="
