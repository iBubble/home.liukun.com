#!/bin/bash
# 修复8443端口重定向问题

NGINX_CONF="/www/server/panel/vhost/nginx/ibubble.vicp.net.conf"

echo "=========================================="
echo "修复8443端口重定向问题"
echo "=========================================="
echo ""

echo "1. 备份当前配置..."
sudo cp $NGINX_CONF ${NGINX_CONF}.bak.redirect_fix
echo "✓ 备份完成"
echo ""

echo "2. 修改重定向规则，允许8443端口..."
# 修改重定向逻辑，允许443和8443端口
sudo sed -i 's/if ($server_port != 443) {/if ($server_port != 443 \&\& $server_port != 8443) {/' $NGINX_CONF
echo "✓ 已修改重定向规则"
echo ""

echo "3. 测试Nginx配置..."
sudo nginx -t
echo ""

if [ $? -eq 0 ]; then
    echo "4. 重载Nginx..."
    sudo nginx -s reload
    echo "✓ Nginx重载成功"
    echo ""
    
    echo "=========================================="
    echo "修复完成！"
    echo "=========================================="
    echo ""
    echo "现在可以测试访问："
    echo "  https://home.liukun.com:8443"
    echo ""
else
    echo "✗ Nginx配置测试失败，恢复备份..."
    sudo cp ${NGINX_CONF}.bak.redirect_fix $NGINX_CONF
    echo "已恢复备份"
fi
