#!/bin/bash
# 测试环境变量代理方式

echo "=== 测试环境变量代理 ==="

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator

# 设置代理环境变量
export HTTP_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"
export HTTPS_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"

echo "HTTP_PROXY=$HTTP_PROXY"
echo "HTTPS_PROXY=$HTTPS_PROXY"
echo ""

# 测试访问 GitHub
echo "测试访问 GitHub API..."
python3 -c "
import requests
try:
    resp = requests.get('https://api.github.com', timeout=10)
    print(f'成功! 状态码: {resp.status_code}')
except Exception as e:
    print(f'失败: {e}')
"
