#!/bin/bash
# 测试真实的节点检测功能

echo "=== NodeLocalChecker 真实检测测试 ==="
echo ""

# 测试节点数据（从 YAML 中提取的第一个节点）
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

CLASH_BIN="$(pwd)/bin/clash"

echo "1. 检查 Clash 核心..."
if [ -f "$CLASH_BIN" ]; then
    echo "✓ Clash 核心存在: $CLASH_BIN"
    $CLASH_BIN -v
else
    echo "✗ Clash 核心不存在"
    exit 1
fi

echo ""
echo "2. 测试 Python 检测脚本..."
echo "命令: python3 scripts/check_node_clash.py"
echo ""

python3 scripts/check_node_clash.py "$NODE_JSON" "$CLASH_BIN"

echo ""
echo "3. 测试 PHP API 接口..."
echo ""

# 创建临时请求文件
cat > /tmp/test_node_request.json << EOF
{
    "node": $NODE_JSON
}
EOF

# 使用 curl 测试 API
curl -X POST \
    -H "Content-Type: application/json" \
    -d @/tmp/test_node_request.json \
    http://localhost/Projects/NodeLocalChecker/api/check.php \
    2>/dev/null | python3 -m json.tool

echo ""
echo "=== 测试完成 ==="
