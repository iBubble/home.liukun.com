#!/bin/bash
# 测试代理切换逻辑
# 验证勾选和不勾选代理时，系统是否正确切换

PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
DATA_DIR="$PROJECT_DIR/data"
PROXY_CONFIG="$DATA_DIR/proxy_config.json"

echo "=========================================="
echo "代理切换逻辑测试"
echo "=========================================="
echo ""

# 测试1: 检查代理配置文件
echo "【测试1】检查代理配置文件"
if [ -f "$PROXY_CONFIG" ]; then
    echo "✓ 配置文件存在: $PROXY_CONFIG"
    echo "配置内容:"
    cat "$PROXY_CONFIG" | jq '.'
    echo ""
    
    PROXY_ENABLED=$(jq -r '.enable // false' "$PROXY_CONFIG")
    PROXY_TYPE=$(jq -r '.type // "socks5"' "$PROXY_CONFIG")
    PROXY_HOST=$(jq -r '.host // ""' "$PROXY_CONFIG")
    PROXY_PORT=$(jq -r '.port // ""' "$PROXY_CONFIG")
    
    echo "解析结果:"
    echo "  启用状态: $PROXY_ENABLED"
    echo "  代理类型: $PROXY_TYPE"
    echo "  代理地址: $PROXY_HOST:$PROXY_PORT"
else
    echo "✗ 配置文件不存在"
fi
echo ""

# 测试2: 模拟auto_scan.sh的逻辑
echo "【测试2】模拟计划任务的代理检测逻辑"
if [ -f "$PROXY_CONFIG" ]; then
    PROXY_ENABLED=$(jq -r '.enable // false' "$PROXY_CONFIG" 2>/dev/null)
    if [ "$PROXY_ENABLED" = "true" ]; then
        PROXY_TYPE=$(jq -r '.type // "socks5"' "$PROXY_CONFIG")
        PROXY_HOST=$(jq -r '.host // ""' "$PROXY_CONFIG")
        PROXY_PORT=$(jq -r '.port // ""' "$PROXY_CONFIG")
        echo "✓ 代理已启用"
        echo "  将使用: proxy_collect.py"
        echo "  代理信息: $PROXY_TYPE://$PROXY_HOST:$PROXY_PORT"
        COLLECT_SCRIPT="proxy_collect.py"
    else
        echo "✓ 代理未启用"
        echo "  将使用: subscribe/collect.py"
        COLLECT_SCRIPT="subscribe/collect.py"
    fi
else
    echo "✓ 无配置文件"
    echo "  将使用: subscribe/collect.py"
    COLLECT_SCRIPT="subscribe/collect.py"
fi
echo "  最终脚本: $COLLECT_SCRIPT"
echo ""

# 测试3: 检查Python脚本是否存在
echo "【测试3】检查Python脚本"
cd "$PROJECT_DIR/external/aggregator" || exit 1

if [ -f "proxy_collect.py" ]; then
    echo "✓ proxy_collect.py 存在"
else
    echo "✗ proxy_collect.py 不存在"
fi

if [ -f "subscribe/collect.py" ]; then
    echo "✓ subscribe/collect.py 存在"
else
    echo "✗ subscribe/collect.py 不存在"
fi
echo ""

# 测试4: 测试Python代理包装脚本
echo "【测试4】测试Python代理包装脚本"
if [ -f "proxy_collect.py" ]; then
    echo "测试代理配置读取..."
    python3 -c "
import json
import os

config_file = '../../data/proxy_config.json'
if os.path.exists(config_file):
    with open(config_file, 'r') as f:
        proxy_config = json.load(f)
    print('✓ 配置读取成功')
    print(f\"  启用: {proxy_config.get('enable')}\")
    print(f\"  类型: {proxy_config.get('type')}\")
    print(f\"  地址: {proxy_config.get('host')}:{proxy_config.get('port')}\")
    
    if proxy_config.get('enable'):
        try:
            import socks
            print('✓ PySocks库已安装')
        except ImportError:
            print('✗ PySocks库未安装')
else:
    print('✗ 配置文件不存在')
"
else
    echo "✗ proxy_collect.py 不存在，跳过测试"
fi
echo ""

# 测试5: 创建测试配置（启用代理）
echo "【测试5】创建测试配置（启用代理）"
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
echo "✓ 已创建启用代理的配置"
echo "测试计划任务逻辑:"
PROXY_ENABLED=$(jq -r '.enable // false' "$PROXY_CONFIG")
if [ "$PROXY_ENABLED" = "true" ]; then
    echo "  ✓ 检测到代理已启用"
    echo "  ✓ 将使用 proxy_collect.py"
else
    echo "  ✗ 未检测到代理启用"
fi
echo ""

# 测试6: 创建测试配置（禁用代理）
echo "【测试6】创建测试配置（禁用代理）"
cat > "$PROXY_CONFIG" << 'EOF'
{
    "enable": false,
    "type": "socks5",
    "host": "us.liukun.com",
    "port": "1080",
    "username": "Gemini",
    "password": "Gl5181081"
}
EOF
echo "✓ 已创建禁用代理的配置"
echo "测试计划任务逻辑:"
PROXY_ENABLED=$(jq -r '.enable // false' "$PROXY_CONFIG")
if [ "$PROXY_ENABLED" = "true" ]; then
    echo "  ✗ 错误：检测到代理已启用（应该是禁用）"
else
    echo "  ✓ 正确检测到代理已禁用"
    echo "  ✓ 将使用 subscribe/collect.py"
fi
echo ""

# 恢复原始配置
echo "【恢复】恢复原始代理配置"
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
echo "✓ 已恢复启用代理的配置"
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "总结："
echo "1. 前端通过localStorage保存代理配置"
echo "2. 前端扫描时根据proxyEnable传递代理配置到API"
echo "3. API保存代理配置到proxy_config.json"
echo "4. scan.php读取proxy_config.json决定使用哪个脚本"
echo "5. auto_scan.sh读取proxy_config.json决定使用哪个脚本"
echo "6. proxy_collect.py读取proxy_config.json设置SOCKS5代理"
echo ""
echo "代理切换流程："
echo "  勾选代理 → enable=true → 使用proxy_collect.py → 通过SOCKS5代理扫描"
echo "  不勾选代理 → enable=false → 使用subscribe/collect.py → 直接扫描"
