#!/bin/bash
# 启动浏览器专用代理（端口7940）

echo "=========================================="
echo "  启动浏览器专用Clash代理"
echo "=========================================="
echo ""

CLASH_BIN="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/clash_bin/clash-linux-amd64"
CLASH_CONFIG="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/clash_data/browser_proxy.yaml"
CLASH_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/clash_data"

# 检查端口是否被占用
if netstat -tlnp 2>/dev/null | grep -q ":7940 "; then
    echo "⚠️  端口7940已被占用"
    echo ""
    netstat -tlnp 2>/dev/null | grep ":7940 "
    echo ""
    read -p "是否要杀掉占用进程？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        PID=$(netstat -tlnp 2>/dev/null | grep ":7940 " | awk '{print $7}' | cut -d'/' -f1)
        if [ ! -z "$PID" ]; then
            kill -9 $PID 2>/dev/null
            echo "✓ 已杀掉进程 $PID"
            sleep 1
        fi
    else
        echo "❌ 取消启动"
        exit 1
    fi
fi

echo "配置文件: $CLASH_CONFIG"
echo "代理端口: HTTP=7939, SOCKS5=7940"
echo ""

# 启动Clash
echo "正在启动Clash..."
$CLASH_BIN -d $CLASH_DIR -f $CLASH_CONFIG

echo ""
echo "Clash已停止"
