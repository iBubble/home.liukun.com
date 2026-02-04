#!/bin/bash
# 直接测试 collect.py

export HTTP_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"
export HTTPS_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"

timeout 30 python3 Projects/Aggregator/external/aggregator/subscribe/collect.py --skip --num 200 --targets clash 2>&1 | grep -E "subscription|found.*proxies|tasks:"
