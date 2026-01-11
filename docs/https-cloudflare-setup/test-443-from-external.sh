#!/bin/bash
# 测试443端口是否真的完全被屏蔽

echo "=========================================="
echo "测试443端口外网访问"
echo "=========================================="
echo ""

PUBLIC_IP="202.98.183.32"
DOMAIN="home.liukun.com"

echo "1. 检查443端口监听状态："
sudo ss -tlnp | grep :443
echo ""

echo "2. 从服务器测试公网IP的443端口："
timeout 5 nc -zv $PUBLIC_IP 443 2>&1
echo ""

echo "3. 使用curl测试HTTPS访问："
timeout 10 curl -I https://$DOMAIN 2>&1 | head -10
echo ""

echo "=========================================="
echo "分析："
echo "=========================================="
echo ""
echo "如果上述测试都成功，说明："
echo "- 服务器到自己的443端口是通的"
echo "- 这意味着Cloudflare也很可能能访问你的443端口"
echo "- 只是普通用户的浏览器被运营商屏蔽了"
echo ""
echo "这种情况下，使用Cloudflare非常简单："
echo "1. 添加域名到Cloudflare"
echo "2. 修改DNS服务器"
echo "3. 开启橙色云朵（代理）"
echo "4. 完成！用户访问443端口 → Cloudflare → 你的443端口"
