#!/usr/bin/env python3
"""测试通过 SOCKS5 代理访问 GitHub"""
import sys
import socket
import socks
import urllib.request
import json

def test_proxy():
    # 读取代理配置
    config_file = 'Projects/Aggregator/data/proxy_config.json'
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    proxy_host = config['host']
    proxy_port = int(config['port'])
    proxy_user = config.get('username')
    proxy_pass = config.get('password')
    
    print("=" * 50)
    print("测试 Python SOCKS5 代理访问")
    print("=" * 50)
    print(f"\n代理配置:")
    print(f"  地址: {proxy_host}:{proxy_port}")
    print(f"  用户: {proxy_user}")
    print(f"  密码: {'*' * len(proxy_pass) if proxy_pass else 'None'}")
    
    # 设置 SOCKS5 代理
    print(f"\n[1] 设置 SOCKS5 代理...")
    socks.set_default_proxy(
        socks.SOCKS5,
        proxy_host,
        proxy_port,
        username=proxy_user,
        password=proxy_pass
    )
    socket.socket = socks.socksocket
    print("✓ 代理已设置")
    
    # 测试访问 GitHub API
    print(f"\n[2] 测试访问 GitHub API...")
    try:
        response = urllib.request.urlopen('https://api.github.com/zen', timeout=10)
        content = response.read().decode('utf-8')
        print(f"✓ 访问成功")
        print(f"响应: {content}")
    except Exception as e:
        print(f"✗ 访问失败: {e}")
        return False
    
    # 测试访问订阅源
    print(f"\n[3] 测试访问 GitHub Raw 订阅源...")
    test_url = 'https://raw.githubusercontent.com/freefq/free/master/v2'
    try:
        response = urllib.request.urlopen(test_url, timeout=10)
        content = response.read()
        print(f"✓ 访问成功")
        print(f"内容长度: {len(content)} 字节")
        print(f"内容预览: {content[:100]}...")
    except Exception as e:
        print(f"✗ 访问失败: {e}")
        return False
    
    print(f"\n" + "=" * 50)
    print("✓ 所有测试通过！代理配置正确")
    print("=" * 50)
    return True

if __name__ == '__main__':
    try:
        success = test_proxy()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
