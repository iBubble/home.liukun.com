#!/usr/bin/env python3
"""直接测试GitHub访问"""

import requests
import re

url = "https://raw.githubusercontent.com/hwanz/SSR-V2ray-Trojan-vpn/main/README.md"

print(f"测试1: 使用requests直接访问")
try:
    response = requests.get(url, timeout=30)
    print(f"✓ 状态码: {response.status_code}")
    print(f"✓ 内容长度: {len(response.text)} 字节")
    
    # 提取机场链接
    groups = re.findall(r"\[.*\]\((https?:\/\/[^\s\r\n]+)\)[^\r\n]+\d+G.*", response.text, flags=re.I)
    print(f"✓ 找到 {len(groups)} 个机场链接")
    
    if groups:
        print("\n前5个链接:")
        for i, link in enumerate(groups[:5], 1):
            print(f"  {i}. {link}")
            
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n测试2: 使用urllib")
try:
    import urllib.request
    req = urllib.request.Request(url)
    req.add_header('User-Agent', 'Mozilla/5.0')
    with urllib.request.urlopen(req, timeout=30) as response:
        content = response.read().decode('utf-8')
        print(f"✓ 内容长度: {len(content)} 字节")
        
        groups = re.findall(r"\[.*\]\((https?:\/\/[^\s\r\n]+)\)[^\r\n]+\d+G.*", content, flags=re.I)
        print(f"✓ 找到 {len(groups)} 个机场链接")
        
except Exception as e:
    print(f"❌ 错误: {e}")
