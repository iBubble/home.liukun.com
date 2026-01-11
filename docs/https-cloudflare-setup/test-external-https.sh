#!/bin/bash
# HTTPS外网访问诊断脚本

echo "========================================="
echo "HTTPS外网访问诊断"
echo "========================================="
echo ""

echo "1. 检查本地443端口监听状态："
sudo ss -tlnp | grep :443
echo ""

echo "2. 检查防火墙443端口规则："
sudo iptables -L -n | grep 443
echo ""

echo "3. 检查Nginx配置："
sudo nginx -t
echo ""

echo "4. 检查SSL证书："
sudo openssl x509 -in /www/server/panel/vhost/cert/ibubble.vicp.net/fullchain.pem -noout -subject -dates -ext subjectAltName
echo ""

echo "5. 本地测试HTTPS连接："
curl -I -k https://127.0.0.1 -H "Host: home.liukun.com" 2>&1 | head -5
echo ""

echo "6. 测试域名解析："
host home.liukun.com
echo ""

echo "7. 从服务器测试外网HTTPS访问："
timeout 5 curl -I https://home.liukun.com 2>&1 | head -10
echo ""

echo "========================================="
echo "诊断建议："
echo "========================================="
echo "如果上述测试都正常，但外网无法访问，可能原因："
echo "1. 运营商封锁了443端口（家庭宽带常见）"
echo "2. 路由器的443端口转发配置有误"
echo "3. 公网IP变化，域名解析未更新"
echo ""
echo "解决方案："
echo "1. 联系运营商确认是否封锁443端口"
echo "2. 使用非标准端口（如8443）+ Nginx监听"
echo "3. 使用Cloudflare等CDN服务"
