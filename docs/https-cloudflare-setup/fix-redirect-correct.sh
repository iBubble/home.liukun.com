#!/bin/bash
# 正确修复8443端口重定向问题

NGINX_CONF="/www/server/panel/vhost/nginx/ibubble.vicp.net.conf"

echo "=========================================="
echo "修复8443端口重定向问题"
echo "=========================================="
echo ""

echo "1. 备份当前配置..."
sudo cp $NGINX_CONF ${NGINX_CONF}.bak.$(date +%Y%m%d_%H%M%S)
echo "✓ 备份完成"
echo ""

echo "2. 修改重定向规则..."
# 使用正确的Nginx语法修改重定向规则
sudo sed -i '/#HTTP_TO_HTTPS_START/,/#HTTP_TO_HTTPS_END/{
    s/if ($server_port != 443) {/if ($server_port = 80) {/
}' $NGINX_CONF

echo "✓ 已修改重定向规则（只对80端口重定向）"
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
    echo "修改说明："
    echo "- 原来：所有非443端口都重定向到443"
    echo "- 现在：只有80端口重定向到443，8443端口可以正常访问"
else
    echo "✗ Nginx配置测试失败"
    echo "请手动检查配置文件"
fi
