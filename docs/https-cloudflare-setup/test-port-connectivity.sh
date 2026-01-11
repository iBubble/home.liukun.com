#!/bin/bash
# 端口连通性测试脚本

echo "=========================================="
echo "端口连通性完整测试"
echo "=========================================="
echo ""

PUBLIC_IP="202.98.183.32"
DOMAIN="home.liukun.com"

echo "1. 测试从服务器到公网IP的80端口："
timeout 5 nc -zv $PUBLIC_IP 80 2>&1
echo ""

echo "2. 测试从服务器到公网IP的443端口："
timeout 5 nc -zv $PUBLIC_IP 443 2>&1
echo ""

echo "3. 测试从服务器到域名的80端口："
timeout 5 nc -zv $DOMAIN 80 2>&1
echo ""

echo "4. 测试从服务器到域名的443端口："
timeout 5 nc -zv $DOMAIN 443 2>&1
echo ""

echo "5. 检查本地监听的端口："
sudo ss -tlnp | grep -E ':(80|443|81)\s'
echo ""

echo "6. 测试本地HTTPS连接："
timeout 5 curl -I -k https://127.0.0.1 -H "Host: home.liukun.com" 2>&1 | head -3
echo ""

echo "7. 测试通过域名的HTTPS连接："
timeout 5 curl -I -k https://$DOMAIN 2>&1 | head -3
echo ""

echo "8. 检查是否有进程占用443端口："
sudo lsof -i :443 | head -5
echo ""

echo "=========================================="
echo "诊断结论："
echo "=========================================="
echo "如果步骤1-2成功，说明路由器端口转发正常"
echo "如果步骤3-4失败，说明域名解析或网络路径有问题"
echo "如果步骤6成功但步骤7失败，说明外网访问被阻断"
