#!/bin/bash
# 测试明显不可用的节点

echo "=== 测试不可用节点检测 ==="
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker

# 确保没有代理
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy

# 测试一个不存在的节点
echo "【测试 1】不存在的服务器 (192.0.2.1:443)"
INVALID_NODE1='{
    "name": "Invalid-Node",
    "type": "vless",
    "server": "192.0.2.1",
    "port": 443,
    "uuid": "00000000-0000-0000-0000-000000000000",
    "network": "tcp",
    "tls": true
}'
python3 scripts/check_node_clash.py "$INVALID_NODE1" "$(pwd)/bin/clash"
echo ""

# 测试一个真实但可能可用的节点
echo "【测试 2】真实节点 (136.175.178.165:443)"
VALID_NODE='{
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
python3 scripts/check_node_clash.py "$VALID_NODE" "$(pwd)/bin/clash"
echo ""

echo "=== 测试完成 ==="
