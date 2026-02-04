#!/bin/bash
# 测试代理自动降级功能

echo "=========================================="
echo "测试代理自动降级功能"
echo "=========================================="

PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
PROXY_CONFIG="$PROJECT_DIR/data/proxy_config.json"

# 测试1: 使用正确的代理配置
echo ""
echo "测试1: 使用正确的代理配置"
echo "------------------------------------------"
cat > "$PROXY_CONFIG" << 'EOF'
{
    "enable": true,
    "type": "socks5",
    "host": "us.liukun.com",
    "port": "1080",
    "username": "Gemini",
    "password": "Gl5181081"
}
EOF

echo "✓ 代理配置已设置: us.liukun.com:1080"
echo "执行测试..."
cd "$PROJECT_DIR/external/aggregator"
timeout 10 python3 proxy_collect.py --help 2>&1 | head -5
echo ""

# 测试2: 使用错误的代理配置（不存在的主机）
echo ""
echo "测试2: 使用错误的代理配置（不存在的主机）"
echo "------------------------------------------"
cat > "$PROXY_CONFIG" << 'EOF'
{
    "enable": true,
    "type": "socks5",
    "host": "invalid-proxy-host.example.com",
    "port": "1080",
    "username": "test",
    "password": "test"
}
EOF

echo "✓ 代理配置已设置: invalid-proxy-host.example.com:1080 (无效)"
echo "执行测试..."
cd "$PROJECT_DIR/external/aggregator"
timeout 10 python3 proxy_collect.py --help 2>&1 | head -5
echo ""

# 测试3: 使用错误的端口
echo ""
echo "测试3: 使用错误的端口"
echo "------------------------------------------"
cat > "$PROXY_CONFIG" << 'EOF'
{
    "enable": true,
    "type": "socks5",
    "host": "us.liukun.com",
    "port": "9999",
    "username": "Gemini",
    "password": "Gl5181081"
}
EOF

echo "✓ 代理配置已设置: us.liukun.com:9999 (错误端口)"
echo "执行测试..."
cd "$PROJECT_DIR/external/aggregator"
timeout 10 python3 proxy_collect.py --help 2>&1 | head -5
echo ""

# 恢复正确的配置
echo ""
echo "恢复正确的代理配置..."
cat > "$PROXY_CONFIG" << 'EOF'
{
    "enable": true,
    "type": "socks5",
    "host": "us.liukun.com",
    "port": "1080",
    "username": "Gemini",
    "password": "Gl5181081"
}
EOF

echo "✓ 代理配置已恢复"
echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "预期结果："
echo "- 测试1: 应显示 '✓ SOCKS5代理已启用'"
echo "- 测试2: 应显示 '✗ 代理连接失败，自动切换到直连模式'"
echo "- 测试3: 应显示 '✗ 代理连接失败，自动切换到直连模式'"
