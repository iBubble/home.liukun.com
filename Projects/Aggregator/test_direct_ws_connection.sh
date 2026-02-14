#!/bin/bash

echo "========== 测试直接WebSocket连接 =========="
echo ""

# 代理服务器信息
SERVER="152.53.131.209"
PORT="8443"
SNI="sni.111000.indevs.in"
PATH_PARAM="/?ed=2560fp=chrome"

echo "📋 代理服务器信息:"
echo "  服务器: $SERVER:$PORT"
echo "  SNI: $SNI"
echo "  路径: $PATH_PARAM"
echo ""

# 测试1: TCP连接
echo "🔍 测试1: TCP连接到代理服务器..."
timeout 5 nc -zv $SERVER $PORT 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ TCP连接成功"
else
    echo "  ❌ TCP连接失败"
fi
echo ""

# 测试2: TLS握手
echo "🔍 测试2: TLS握手..."
echo | timeout 5 openssl s_client -connect $SERVER:$PORT -servername $SNI 2>&1 | grep -E "(Verify return code|subject=|issuer=)" | head -5
if [ $? -eq 0 ]; then
    echo "  ✅ TLS握手成功"
else
    echo "  ❌ TLS握手失败"
fi
echo ""

# 测试3: 完整的WebSocket升级请求
echo "🔍 测试3: WebSocket升级请求..."
(
    echo -e "GET $PATH_PARAM HTTP/1.1\r"
    echo -e "Host: $SNI\r"
    echo -e "Upgrade: websocket\r"
    echo -e "Connection: Upgrade\r"
    echo -e "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r"
    echo -e "Sec-WebSocket-Version: 13\r"
    echo -e "\r"
) | timeout 5 openssl s_client -connect $SERVER:$PORT -servername $SNI -quiet 2>&1 | head -10

echo ""
echo "========== 测试完成 =========="
