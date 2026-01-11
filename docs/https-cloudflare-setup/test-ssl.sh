#!/bin/bash

echo "=== SSL证书诊断 ==="
echo ""

echo "1. 测试证书链完整性..."
echo | openssl s_client -connect home.liukun.com:443 -servername home.liukun.com 2>&1 | grep -A30 "Certificate chain"

echo ""
echo "2. 验证返回码..."
echo | openssl s_client -connect home.liukun.com:443 -servername home.liukun.com 2>&1 | grep "Verify return code"

echo ""
echo "3. 检查证书文件..."
echo "证书数量: $(sudo grep -c "BEGIN CERTIFICATE" /www/server/panel/vhost/cert/ibubble.vicp.net/fullchain.pem)"

echo ""
echo "4. 证书详细信息..."
sudo openssl x509 -in /www/server/panel/vhost/cert/ibubble.vicp.net/fullchain.pem -noout -subject -issuer -dates

echo ""
echo "5. 测试HTTPS连接..."
curl -I https://home.liukun.com 2>&1 | head -5

echo ""
echo "=== 可能的问题 ==="
echo "如果浏览器显示不安全，可能是："
echo "1. 浏览器缓存了旧证书 - 清除浏览器缓存"
echo "2. 系统时间不正确 - 检查服务器时间"
echo "3. 中间证书问题 - 检查证书链"
echo "4. 浏览器不信任Let's Encrypt - 更新浏览器"
