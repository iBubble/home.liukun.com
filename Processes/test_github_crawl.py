#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试GitHub爬取功能"""

import sys
import os
import re

# 添加aggregator到路径
aggregator_path = '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator'
sys.path.insert(0, aggregator_path)
sys.path.insert(0, os.path.join(aggregator_path, 'subscribe'))

import utils

def test_crawl_jctj():
    """测试从GitHub爬取机场列表"""
    url = "https://raw.githubusercontent.com/hwanz/SSR-V2ray-Trojan-vpn/main/README.md"
    print(f"正在从 {url} 爬取...")
    
    content = utils.http_get(url=url)
    if not content:
        print("❌ 无法获取内容")
        return {}
    
    print(f"✓ 获取到内容，长度: {len(content)} 字节")
    
    # 提取机场链接
    groups = re.findall(r"\[.*\]\((https?:\/\/[^\s\r\n]+)\)[^\r\n]+\d+G.*", content, flags=re.I)
    print(f"✓ 找到 {len(groups)} 个匹配项")
    
    if groups:
        print("\n前10个链接:")
        for i, link in enumerate(groups[:10], 1):
            print(f"  {i}. {link}")
    
    # 提取域名
    domains = {}
    for link in groups:
        domain = utils.extract_domain(url=link, include_protocal=True)
        if domain:
            domains[domain] = ""
    
    print(f"\n✓ 提取到 {len(domains)} 个唯一域名")
    
    if domains:
        print("\n前10个域名:")
        for i, domain in enumerate(list(domains.keys())[:10], 1):
            print(f"  {i}. {domain}")
    
    return domains

if __name__ == "__main__":
    result = test_crawl_jctj()
    print(f"\n总计: {len(result)} 个域名")
