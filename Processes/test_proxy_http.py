#!/usr/bin/env python3
"""测试 HTTP 流量是否真正通过代理"""
import sys
import socket
import socks
import json

def test_proxy_http():
    # 读取代理配置
    config_file = 'Projects/Aggregator/data/proxy_config.json'
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    proxy_host = config['host']
    proxy_port = int(config['port'])
    proxy_user = config.get('username')
    proxy_pass = config.get('password')
    
    print("=" * 60)
    print("测试 HTTP 流量通过 SOCKS5 代理")
    print("=" * 60)
    print(f"\n代理配置: {proxy_host}:{proxy_port}")
    print(f"用户名: {proxy_user}")
    
    # 设置代理
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
    
    # 测试 HTTP 连接
    print(f"\n[2] 测试通过代理建立 HTTP 连接...")
    try:
        import http.client
        conn = http.client.HTTPSConnection("www.google.com", timeout=10)
        conn.request("GET", "/")
        response = conn.getresponse()
        print(f"✓ HTTP 连接成功")
        print(f"状态码: {response.status}")
        print(f"响应头: {dict(list(response.getheaders())[:3])}")
        conn.close()
    except Exception as e:
        print(f"✗ HTTP 连接失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 测试访问 GitHub
    print(f"\n[3] 测试访问 GitHub...")
    try:
        conn = http.client.HTTPSConnection("api.github.com", timeout=10)
        conn.request("GET", "/zen")
        response = conn.getresponse()
        content = response.read().decode('utf-8')
        print(f"✓ GitHub 访问成功")
        print(f"响应: {content}")
        conn.close()
    except Exception as e:
        print(f"✗ GitHub 访问失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print(f"\n" + "=" * 60)
    print("✓ 代理 HTTP 流量测试通过")
    print("=" * 60)
    return True

if __name__ == '__main__':
    try:
        success = test_proxy_http()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
