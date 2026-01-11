#!/bin/bash
# 配置HTTPS使用备用端口（8443）

echo "=========================================="
echo "配置HTTPS备用端口（8443）"
echo "=========================================="
echo ""

NGINX_CONF="/www/server/panel/vhost/nginx/ibubble.vicp.net.conf"

echo "1. 备份当前Nginx配置..."
sudo cp $NGINX_CONF ${NGINX_CONF}.bak.$(date +%Y%m%d_%H%M%S)
echo "✓ 备份完成"
echo ""

echo "2. 添加8443端口监听..."
sudo sed -i '/listen 443 ssl;/a\    listen 8443 ssl;' $NGINX_CONF
echo "✓ 已添加8443端口"
echo ""

echo "3. 测试Nginx配置..."
sudo nginx -t
echo ""

if [ $? -eq 0 ]; then
    echo "4. 重载Nginx..."
    sudo nginx -s reload
    echo "✓ Nginx重载成功"
    echo ""
    
    echo "5. 开放防火墙8443端口..."
    sudo ufw allow 8443/tcp
    echo "✓ 防火墙规则已添加"
    echo ""
    
    echo "=========================================="
    echo "配置完成！"
    echo "=========================================="
    echo ""
    echo "下一步操作："
    echo "1. 在路由器上添加端口转发："
    echo "   外部端口: 8443 → 内网IP: 192.168.1.40 → 内网端口: 8443"
    echo ""
    echo "2. 测试访问："
    echo "   https://home.liukun.com:8443"
    echo ""
    echo "3. 如果8443端口可以访问，说明运营商确实屏蔽了443端口"
else
    echo "✗ Nginx配置测试失败，请检查配置文件"
fi
