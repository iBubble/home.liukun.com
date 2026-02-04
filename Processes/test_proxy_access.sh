#!/bin/bash

echo "=========================================="
echo "测试通过 SOCKS5 代理访问 GitHub"
echo "=========================================="

PROXY_HOST="us.liukun.com"
PROXY_PORT="1080"
PROXY_USER="Gemini"
PROXY_PASS="Gl5181081"

echo ""
echo "[1] 测试代理连接"
echo "----------------------------------------"
echo "代理地址: socks5://$PROXY_HOST:$PROXY_PORT"

# 测试访问 GitHub
echo ""
echo "[2] 通过代理访问 GitHub API"
echo "----------------------------------------"
response=$(curl -s -m 10 \
    --socks5 "$PROXY_HOST:$PROXY_PORT" \
    --proxy-user "$PROXY_USER:$PROXY_PASS" \
    https://api.github.com/zen 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ 代理连接成功"
    echo "响应: $response"
else
    echo "✗ 代理连接失败"
    echo "错误: $response"
fi

echo ""
echo "[3] 通过代理访问订阅源"
echo "----------------------------------------"
url="https://raw.githubusercontent.com/freefq/free/master/v2"
echo "URL: $url"

content=$(curl -s -m 10 \
    --socks5 "$PROXY_HOST:$PROXY_PORT" \
    --proxy-user "$PROXY_USER:$PROXY_PASS" \
    "$url" 2>&1)

if [ $? -eq 0 ] && [ -n "$content" ]; then
    echo "✓ 访问成功"
    echo "内容长度: ${#content} 字节"
    echo "内容预览:"
    echo "$content" | head -3
else
    echo "✗ 访问失败"
    echo "错误: $content"
fi

echo ""
echo "=========================================="
