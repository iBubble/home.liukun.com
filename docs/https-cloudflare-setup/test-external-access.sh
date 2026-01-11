#!/bin/bash
# 外网访问诊断脚本

echo "=========================================="
echo "外网访问诊断测试"
echo "=========================================="
echo ""

echo "1. 检查本地443端口监听状态："
sudo ss -tlnp | grep :443
echo ""

echo "2. 检查防火墙443端口规则："
sudo iptables -L -n | grep 443
echo ""

echo "3. 检查Nginx配置中的server_name："
sudo grep -r "server_name" /www/server/panel/vhost/nginx/*.conf | grep -v backup
echo ""

echo "4. 测试从本机访问HTTPS："
curl -I -k https://home.liukun.com 2>&1 | head -5
echo ""

echo "5. 检查SSL证书域名："
sudo openssl x509 -in /www/server/panel/vhost/cert/ibubble.vicp.net/fullchain.pem -noout -text | grep -A 2 "Subject Alternative Name"
echo ""

echo "6. 检查公网IP："
curl -s ifconfig.me
echo ""
echo ""

echo "=========================================="
echo "可能的原因："
echo "=========================================="
echo "1. 运营商屏蔽了443端口（家庭宽带常见）"
echo "2. 路由器的443端口转发未生效"
echo "3. 防火墙规则问题"
echo "4. SSL证书域名不匹配"
echo ""
echo "建议："
echo "- 尝试使用非标准端口（如8443）"
echo "- 联系运营商确认是否屏蔽443端口"
echo "- 检查路由器日志"
