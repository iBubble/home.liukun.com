#!/bin/bash
# 快速测试Cookie是否有效

echo "=========================================="
echo "  测试linux.do Cookie"
echo "=========================================="
echo ""

COOKIE_FILE="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/linuxdo_cookie.txt"
TEST_URL="https://linux.do/t/topic/1590573.json"
PROXY="socks5://127.0.0.1:7940"

# 检查Cookie文件
if [ ! -f "$COOKIE_FILE" ]; then
    echo "❌ Cookie文件不存在: $COOKIE_FILE"
    exit 1
fi

COOKIE=$(cat "$COOKIE_FILE")
echo "✓ Cookie已加载 (${COOKIE:0:50}...)"
echo ""

# 检查代理
echo "检查代理状态..."
if netstat -tln 2>/dev/null | grep -q ":7940 "; then
    echo "✓ 代理运行在7940端口"
else
    echo "❌ 代理未运行，请在VNC终端运行:"
    echo "   bash start_browser_proxy.sh"
    exit 1
fi
echo ""

# 测试访问
echo "正在测试访问 $TEST_URL ..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -x "$PROXY" \
    --max-time 30 \
    -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
    -H "Accept: application/json" \
    -H "Cookie: $COOKIE" \
    "$TEST_URL" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP状态码: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Cookie有效！"
    echo ""
    
    # 尝试解析JSON
    TITLE=$(echo "$BODY" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ ! -z "$TITLE" ]; then
        echo "帖子标题: $TITLE"
        echo ""
        echo "✅ 可以正常访问linux.do的受限内容！"
    fi
    
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ 403 Forbidden - Cookie已失效"
    echo ""
    echo "需要重新获取Cookie:"
    echo "1. 在VNC的Chrome中登录linux.do"
    echo "2. F12 -> Console -> 输入: document.cookie"
    echo "3. 复制Cookie并保存到文件"
    
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ 连接失败 - 代理可能有问题"
    echo ""
    echo "响应内容:"
    echo "$BODY" | head -20
    
else
    echo "⚠️ 未预期的状态码"
    echo ""
    echo "响应内容 (前500字符):"
    echo "$BODY" | head -c 500
fi

echo ""
echo "=========================================="
