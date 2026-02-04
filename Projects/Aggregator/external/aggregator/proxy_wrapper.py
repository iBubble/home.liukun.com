#!/usr/bin/env python3
"""简单的 SOCKS5 代理包装器"""
import sys
import os
import socket
import socks
import json

# 读取代理配置
config_file = os.path.join(os.path.dirname(__file__), '../../data/proxy_config.json')
if os.path.exists(config_file):
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    if config.get('enable'):
        proxy_host = config['host']
        proxy_port = int(config['port'])
        proxy_user = config.get('username')
        proxy_pass = config.get('password')
        
        # 设置默认代理
        socks.set_default_proxy(
            socks.SOCKS5,
            proxy_host,
            proxy_port,
            username=proxy_user,
            password=proxy_pass
        )
        
        # 强制使用 IPv4
        _original_getaddrinfo = socket.getaddrinfo
        def getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
            return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        socket.getaddrinfo = getaddrinfo_ipv4
        
        # 替换 socket
        socket.socket = socks.socksocket
        
        print(f"[代理] SOCKS5 代理已启用: {proxy_host}:{proxy_port}", file=sys.stderr)

# 切换到 subscribe 目录
subscribe_dir = os.path.join(os.path.dirname(__file__), 'subscribe')
os.chdir(subscribe_dir)
sys.path.insert(0, subscribe_dir)

# 运行 collect.py 的主函数
if __name__ == '__main__':
    # 直接运行 collect.py 作为脚本
    collect_py = os.path.join(subscribe_dir, 'collect.py')
    with open(collect_py, 'rb') as f:
        exec(compile(f.read(), collect_py, 'exec'))
