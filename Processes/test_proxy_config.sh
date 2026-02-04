#!/bin/bash
# 测试代理配置功能

echo "=========================================="
echo "Aggregator 代理配置测试"
echo "=========================================="
echo ""

# 1. 测试保存代理配置
echo "1. 测试保存代理配置"
echo "---"
curl -s -X POST "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "proxy": {
      "enable": true,
      "type": "http",
      "host": "127.0.0.1",
      "port": "7890",
      "username": "",
      "password": ""
    }
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print('✓ API响应:', data.get('message'))"

echo ""

# 2. 检查代理配置文件是否创建
echo "2. 检查代理配置文件"
echo "---"
if [ -f "Projects/Aggregator/data/proxy_config.json" ]; then
    echo "✓ 代理配置文件已创建"
    echo "内容:"
    cat Projects/Aggregator/data/proxy_config.json | python3 -m json.tool
else
    echo "✗ 代理配置文件不存在"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
