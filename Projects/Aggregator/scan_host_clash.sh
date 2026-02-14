#!/bin/bash

echo "========== 扫描局域网中的Clash代理 =========="
echo ""

# 从ARP表获取的IP列表
IPS=(
    "192.168.1.129"
    "192.168.1.148"
    "192.168.1.143"
    "192.168.1.120"
    "192.168.1.144"
    "192.168.1.141"
    "192.168.1.139"
    "192.168.1.135"
    "192.168.1.136"
    "192.168.1.131"
)

# Clash常用端口
PORTS=(7890 7891 7892 7893)

echo "🔍 扫描 ${#IPS[@]} 个IP地址..."
echo ""

for ip in "${IPS[@]}"; do
    for port in "${PORTS[@]}"; do
        # 快速检测端口是否开放
        if timeout 1 bash -c "echo >/dev/tcp/$ip/$port" 2>/dev/null; then
            echo "✅ 发现开放端口: $ip:$port"
            
            # 测试是否是Clash代理
            echo "   测试代理功能..."
            http_code=$(curl -s -x http://$ip:$port -k --connect-timeout 5 --max-time 10 \
                -o /dev/null -w "%{http_code}" https://www.google.com 2>/dev/null)
            
            if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
                echo "   ✅ 代理可用！状态码: $http_code"
                echo ""
                echo "🎉 找到可用的Clash代理: http://$ip:$port"
                echo ""
                echo "保存配置..."
                echo "{\"hostClashProxy\":\"http://$ip:$port\",\"discoveredAt\":\"$(date -Iseconds)\"}" > Projects/Aggregator/host_clash_config.json
                echo "✅ 配置已保存到 host_clash_config.json"
                exit 0
            else
                echo "   ⚠️ 端口开放但代理不可用 (状态码: $http_code)"
            fi
        fi
    done
done

echo ""
echo "❌ 未找到可用的Clash代理"
echo ""
echo "请检查："
echo "1. 宿主机的Clash是否正在运行？"
echo "2. Clash配置中 allow-lan 是否为 true？"
echo "3. 宿主机防火墙是否允许局域网访问？"
