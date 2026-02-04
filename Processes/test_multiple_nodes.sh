#!/bin/bash
# 测试多个节点的检测

echo "=== 测试多个节点检测 ==="
echo ""

cd /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker

# 确保没有代理
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy

# 测试节点 1
echo "【节点 1】US-美国 (136.175.178.165:443)"
NODE1='{
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
python3 scripts/check_node_clash.py "$NODE1" "$(pwd)/bin/clash"
echo ""

# 测试节点 2
echo "【节点 2】US-美国_1 (136.175.178.165:443)"
NODE2='{
    "name": "US-美国_1",
    "type": "vless",
    "server": "136.175.178.165",
    "port": 443,
    "uuid": "11126287-ab9f-451f-b68f-51c9b7c4a9d5",
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
python3 scripts/check_node_clash.py "$NODE2" "$(pwd)/bin/clash"
echo ""

# 测试节点 3
echo "【节点 3】US-美国_2 (136.175.178.165:443)"
NODE3='{
    "name": "US-美国_2",
    "type": "vless",
    "server": "136.175.178.165",
    "port": 443,
    "uuid": "5e70d14a-8c4c-4733-9376-8e8689e23881",
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
python3 scripts/check_node_clash.py "$NODE3" "$(pwd)/bin/clash"
echo ""

echo "=== 测试完成 ==="
