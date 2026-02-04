#!/usr/bin/env python3
"""测试订阅源是否有效"""

import requests
import sys

# 读取订阅源列表
with open('Projects/Aggregator/external/aggregator/data/subscribes.txt', 'r') as f:
    urls = [line.strip() for line in f if line.strip() and line.strip().startswith('http')]

print(f"总共 {len(urls)} 个订阅源\n")

valid_count = 0
for i, url in enumerate(urls[:10], 1):  # 只测试前10个
    try:
        print(f"{i}. 测试: {url[:60]}...")
        response = requests.get(url, timeout=10)
        if response.status_code == 200 and len(response.text) > 100:
            print(f"   ✓ 有效 (状态码: {response.status_code}, 长度: {len(response.text)} 字节)")
            valid_count += 1
            # 检查是否包含节点信息
            if 'proxies:' in response.text or 'server:' in response.text:
                print(f"   ✓ 包含节点信息")
        else:
            print(f"   ✗ 无效 (状态码: {response.status_code}, 长度: {len(response.text)} 字节)")
    except Exception as e:
        print(f"   ✗ 错误: {e}")
    print()

print(f"\n前10个订阅源中有效: {valid_count}/10")
