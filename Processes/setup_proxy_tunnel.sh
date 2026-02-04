#!/bin/bash
# SSH隧道代理转发脚本
# 在MacBook上运行此脚本，将本地SOCKS5代理转发到服务器

echo "=========================================="
echo "SSH隧道代理转发设置"
echo "=========================================="
echo ""

# 配置
REMOTE_HOST="gemini@服务器IP"  # 修改为实际服务器IP
LOCAL_SOCKS_HOST="us.liukun.com"
LOCAL_SOCKS_PORT="1080"
TUNNEL_PORT="1080"

echo "配置信息："
echo "  远程服务器: $REMOTE_HOST"
echo "  本地代理: $LOCAL_SOCKS_HOST:$LOCAL_SOCKS_PORT"
echo "  隧道端口: $TUNNEL_PORT"
echo ""

# 检查是否已有隧道在运行
if pgrep -f "ssh.*-D.*$TUNNEL_PORT" > /dev/null; then
    echo "⚠️  检测到已有SSH隧道在运行"
    echo "是否要停止现有隧道？(y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        pkill -f "ssh.*-D.*$TUNNEL_PORT"
        echo "✓ 已停止现有隧道"
        sleep 1
    else
        echo "保持现有隧道运行"
        exit 0
    fi
fi

echo ""
echo "正在建立SSH隧道..."
echo "命令: ssh -D $TUNNEL_PORT -N -f $REMOTE_HOST"
echo ""

# 建立SSH隧道
# -D: 动态端口转发（SOCKS5代理）
# -N: 不执行远程命令
# -f: 后台运行
ssh -D $TUNNEL_PORT -N -f $REMOTE_HOST

if [ $? -eq 0 ]; then
    echo "✓ SSH隧道已建立"
    echo ""
    echo "现在可以在Aggregator设置中配置："
    echo "  类型: SOCKS5"
    echo "  地址: 127.0.0.1"
    echo "  端口: $TUNNEL_PORT"
    echo ""
    echo "要停止隧道，运行: pkill -f 'ssh.*-D.*$TUNNEL_PORT'"
else
    echo "✗ SSH隧道建立失败"
    exit 1
fi
