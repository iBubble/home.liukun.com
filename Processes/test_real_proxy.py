#!/usr/bin/env python3
"""真正测试代理连接 - 检查出口IP"""
import sys
import socket
import socks
import urllib.request
import json

def get_ip_without_proxy():
    """不使用代理获取IP"""
    try:
        response = urllib.request.urlopen('https://api.ipify.org?format=json', timeout=5)
        data = json.loads(response.read().decode('utf-8'))
        return data['ip']
    except Exception as e:
        print(f"获取本地IP失败: {e}")
        return None

def get_ip_with_proxy(proxy_host, proxy_port, proxy_user, proxy_pass):
    """使用代理获取IP"""
    try:
        # 设置代理
        socks.set_default_proxy(
            socks.SOCKS5,
            proxy_host,
            proxy_port,
            username=proxy_user,
            password=proxy_pass
        )
        socket.socket = socks.socksocket
        
        # 获取IP
        response = urllib.request.urlopen('https://api.ipify.org?format=json', timeout=10)
        data = json.loads(response.read().decode('utf-8'))
        return data['ip']
    except Exception as e:
        print(f"通过代理获取IP失败: {e}")
        return None

def main():
    # 读取代理配置
    config_file = 'Projects/Aggregator/data/proxy_config.json'
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    proxy_host = config['host']
    proxy_port = int(config['port'])
    proxy_user = config.get('username')
    proxy_pass = config.get('password')
    
    print("=" * 60)
    print("真实代理连接测试 - 对比出口IP")
    print("=" * 60)
    
    print(f"\n代理配置:")
    print(f"  地址: {proxy_host}:{proxy_port}")
    print(f"  用户: {proxy_user}")
    
    # 测试不使用代理
    print(f"\n[1] 不使用代理，获取本地出口IP...")
    local_ip = get_ip_without_proxy()
    if local_ip:
        print(f"✓ 本地出口IP: {local_ip}")
    else:
        print(f"✗ 无法获取本地IP")
        return False
    
    # 测试使用代理
    print(f"\n[2] 使用 SOCKS5 代理，获取代理出口IP...")
    proxy_ip = get_ip_with_proxy(proxy_host, proxy_port, proxy_user, proxy_pass)
    if proxy_ip:
        print(f"✓ 代理出口IP: {proxy_ip}")
    else:
        print(f"✗ 无法通过代理获取IP")
        return False
    
    # 对比结果
    print(f"\n[3] 对比结果:")
    print(f"  本地IP: {local_ip}")
    print(f"  代理IP: {proxy_ip}")
    
    if local_ip == proxy_ip:
        print(f"\n✗ 警告：两个IP相同，代理可能没有生效！")
        return False
    else:
        print(f"\n✓ 成功：两个IP不同，代理正常工作！")
        return True

if __name__ == '__main__':
    try:
        success = main()
        print("=" * 60)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
