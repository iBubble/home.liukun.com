#!/bin/bash

# 测试使用xray-core替代Clash
# 目的: 排查是否是Clash客户端的问题

echo "=========================================="
echo "测试使用xray-core访问HTTPS网站"
echo "=========================================="

# 1. 检查xray-core是否已安装
if ! command -v xray &> /dev/null; then
    echo "❌ xray-core未安装，开始安装..."
    
    # 使用国内镜像下载xray-core
    XRAY_VERSION="1.8.24"
    DOWNLOAD_URL="https://ghproxy.com/https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VERSION}/Xray-linux-64.zip"
    
    echo "📥 从国内镜像下载xray-core v${XRAY_VERSION}..."
    wget -O /tmp/xray.zip "$DOWNLOAD_URL" || {
        echo "❌ 下载失败，尝试备用镜像..."
        DOWNLOAD_URL="https://mirror.ghproxy.com/https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VERSION}/Xray-linux-64.zip"
        wget -O /tmp/xray.zip "$DOWNLOAD_URL" || {
            echo "❌ 下载失败"
            exit 1
        }
    }
    
    echo "📦 解压xray-core..."
    mkdir -p xray_bin
    unzip -o /tmp/xray.zip -d xray_bin/
    chmod +x xray_bin/xray
    rm /tmp/xray.zip
    
    echo "✅ xray-core安装完成"
    XRAY_BIN="./xray_bin/xray"
else
    echo "✅ xray-core已安装"
    XRAY_BIN="xray"
fi

# 2. 创建xray配置文件
echo ""
echo "📝 创建xray配置文件..."

cat > xray_config.json << 'EOF'
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 17892,
      "protocol": "http",
      "settings": {
        "timeout": 0
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "152.53.131.209",
            "port": 8443,
            "users": [
              {
                "id": "6202b230-417c-4d8e-b624-0f71afa9c75d",
                "encryption": "none"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "security": "tls",
        "tlsSettings": {
          "serverName": "sni.111000.indevs.in",
          "allowInsecure": true
        },
        "wsSettings": {
          "path": "/?ed=2560fp=chrome",
          "headers": {
            "Host": "sni.111000.indevs.in"
          }
        },
        "sockopt": {
          "tcpFastOpen": false
        }
      }
    }
  ]
}
EOF

echo "✅ 配置文件创建完成"

# 3. 启动xray-core
echo ""
echo "🚀 启动xray-core..."
$XRAY_BIN -c xray_config.json > xray.log 2>&1 &
XRAY_PID=$!

echo "✅ xray-core已启动 (PID: $XRAY_PID)"
echo "   HTTP代理: http://127.0.0.1:17892"

# 等待启动
sleep 2

# 4. 测试HTTP网站
echo ""
echo "=========================================="
echo "测试1: HTTP网站 (http://example.com)"
echo "=========================================="
curl -x http://127.0.0.1:17892 \
     -v \
     --max-time 10 \
     http://example.com 2>&1 | head -20

# 5. 测试HTTPS网站
echo ""
echo "=========================================="
echo "测试2: HTTPS网站 (https://linux.do)"
echo "=========================================="
curl -x http://127.0.0.1:17892 \
     -v \
     --max-time 10 \
     https://linux.do 2>&1 | head -30

echo ""
echo "=========================================="
echo "测试3: HTTPS网站 (https://www.google.com)"
echo "=========================================="
curl -x http://127.0.0.1:17892 \
     -v \
     --max-time 10 \
     https://www.google.com 2>&1 | head -30

# 6. 停止xray-core
echo ""
echo "🛑 停止xray-core..."
kill $XRAY_PID 2>/dev/null
wait $XRAY_PID 2>/dev/null

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "📊 结果分析:"
echo "   - 如果xray-core可以访问HTTPS: 说明是Clash客户端的问题"
echo "   - 如果xray-core也失败: 说明是虚拟机网络环境的问题"
echo ""
echo "💡 下一步:"
echo "   - 如果xray-core成功: 考虑在app.js中集成xray-core"
echo "   - 如果xray-core失败: 需要检查虚拟机网络配置/iptables规则"
