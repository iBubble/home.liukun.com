#!/bin/bash

echo "========== 测试代理连接 =========="
echo ""

# 测试代理池中的第一个节点
NODE_NAME="试用节点-新加坡"
PROXY_PORT=7891

echo "1. 检查Clash进程..."
ps aux | grep clash | grep -v grep | grep fetch_proxy

echo ""
echo "2. 检查端口占用..."
netstat -tlnp | grep $PROXY_PORT

echo ""
echo "3. 测试代理连接 (Google 204)..."
curl -v -x http://127.0.0.1:$PROXY_PORT \
  --max-time 10 \
  http://www.gstatic.com/generate_204 \
  2>&1 | head -30

echo ""
echo "4. 测试代理连接 (Cloudflare)..."
curl -v -x http://127.0.0.1:$PROXY_PORT \
  --max-time 10 \
  http://cp.cloudflare.com/generate_204 \
  2>&1 | head -30
