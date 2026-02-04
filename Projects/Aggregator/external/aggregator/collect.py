#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
机场聚合器核心模拟器
用于演示和测试目的
"""

import argparse
import json
import time
import random
import os
import sys

def generate_sample_nodes():
    """生成示例节点数据"""
    sample_nodes = [
        {
            "name": "🇺🇸 美国-洛杉矶-01",
            "type": "vmess",
            "server": "us-la-01.example.com",
            "port": 443,
            "uuid": "12345678-1234-1234-1234-123456789abc",
            "alterId": 0,
            "cipher": "auto",
            "network": "ws",
            "path": "/path",
            "tls": True
        },
        {
            "name": "🇯🇵 日本-东京-01",
            "type": "vmess", 
            "server": "jp-tokyo-01.example.com",
            "port": 443,
            "uuid": "87654321-4321-4321-4321-cba987654321",
            "alterId": 0,
            "cipher": "auto",
            "network": "ws",
            "path": "/path",
            "tls": True
        },
        {
            "name": "🇭🇰 香港-01",
            "type": "trojan",
            "server": "hk-01.example.com",
            "port": 443,
            "password": "password123",
            "sni": "hk-01.example.com"
        },
        {
            "name": "🇸🇬 新加坡-01",
            "type": "ss",
            "server": "sg-01.example.com",
            "port": 8388,
            "cipher": "aes-256-gcm",
            "password": "password456"
        },
        {
            "name": "🇰🇷 韩国-首尔-01",
            "type": "vmess",
            "server": "kr-seoul-01.example.com",
            "port": 443,
            "uuid": "abcdef12-3456-7890-abcd-ef1234567890",
            "alterId": 0,
            "cipher": "auto",
            "network": "ws",
            "path": "/ws",
            "tls": True
        }
    ]
    return sample_nodes

def generate_clash_config(nodes, with_speed_test=False):
    """生成Clash配置"""
    proxies = []
    proxy_names = []
    
    for node in nodes:
        proxy_name = node['name']
        proxy_names.append(proxy_name)
        
        if node['type'] == 'vmess':
            proxy = {
                'name': proxy_name,
                'type': 'vmess',
                'server': node['server'],
                'port': node['port'],
                'uuid': node['uuid'],
                'alterId': node['alterId'],
                'cipher': node['cipher'],
                'network': node['network'],
                'ws-opts': {
                    'path': node['path']
                },
                'tls': node['tls']
            }
        elif node['type'] == 'trojan':
            proxy = {
                'name': proxy_name,
                'type': 'trojan',
                'server': node['server'],
                'port': node['port'],
                'password': node['password'],
                'sni': node['sni']
            }
        elif node['type'] == 'ss':
            proxy = {
                'name': proxy_name,
                'type': 'ss',
                'server': node['server'],
                'port': node['port'],
                'cipher': node['cipher'],
                'password': node['password']
            }
        
        # 如果启用测速，添加延迟信息
        if with_speed_test:
            delay = random.randint(50, 800)
            proxy['delay'] = delay
            
        proxies.append(proxy)
    
    config = {
        'port': 7890,
        'socks-port': 7891,
        'allow-lan': True,
        'mode': 'rule',
        'log-level': 'info',
        'external-controller': '127.0.0.1:9090',
        'proxies': proxies,
        'proxy-groups': [
            {
                'name': '🚀 节点选择',
                'type': 'select',
                'proxies': ['♻️ 自动选择', '🔯 故障转移'] + proxy_names
            },
            {
                'name': '♻️ 自动选择',
                'type': 'url-test',
                'proxies': proxy_names,
                'url': 'http://www.gstatic.com/generate_204',
                'interval': 300
            },
            {
                'name': '🔯 故障转移',
                'type': 'fallback',
                'proxies': proxy_names,
                'url': 'http://www.gstatic.com/generate_204',
                'interval': 300
            }
        ],
        'rules': [
            'DOMAIN-SUFFIX,google.com,🚀 节点选择',
            'DOMAIN-SUFFIX,youtube.com,🚀 节点选择',
            'DOMAIN-SUFFIX,facebook.com,🚀 节点选择',
            'DOMAIN-SUFFIX,twitter.com,🚀 节点选择',
            'GEOIP,CN,DIRECT',
            'MATCH,🚀 节点选择'
        ]
    }
    
    return config

def main():
    parser = argparse.ArgumentParser(description='机场聚合器核心模拟器')
    parser.add_argument('--overwrite', action='store_true', help='覆盖现有文件')
    parser.add_argument('--skip', action='store_true', help='跳过测速')
    parser.add_argument('--delay', type=int, default=3000, help='测速超时时间(毫秒)')
    
    args = parser.parse_args()
    
    print("🚀 机场聚合器启动中...")
    print("📡 正在扫描机场节点...")
    
    # 模拟扫描过程
    time.sleep(2)
    
    # 生成示例节点
    nodes = generate_sample_nodes()
    
    if not args.skip:
        print("⚡ 正在进行延迟测试...")
        time.sleep(3)
        with_speed_test = True
    else:
        print("⏭️  跳过延迟测试")
        with_speed_test = False
    
    # 生成Clash配置
    clash_config = generate_clash_config(nodes, with_speed_test)
    
    # 确保data目录存在
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # 保存配置文件 (简化版YAML)
    clash_file = os.path.join(data_dir, 'clash.yaml')
    with open(clash_file, 'w', encoding='utf-8') as f:
        f.write("# Clash配置文件\n")
        f.write("port: 7890\n")
        f.write("socks-port: 7891\n")
        f.write("allow-lan: true\n")
        f.write("mode: rule\n")
        f.write("log-level: info\n")
        f.write("external-controller: 127.0.0.1:9090\n\n")
        f.write("proxies:\n")
        for proxy in clash_config['proxies']:
            f.write(f"  - name: {proxy['name']}\n")
            f.write(f"    type: {proxy['type']}\n")
            f.write(f"    server: {proxy['server']}\n")
            f.write(f"    port: {proxy['port']}\n")
            if 'delay' in proxy:
                f.write(f"    # delay: {proxy['delay']}ms\n")
            f.write("\n")
    
    # 保存节点列表
    nodes_file = os.path.join(data_dir, 'nodes.json')
    with open(nodes_file, 'w', encoding='utf-8') as f:
        json.dump(nodes, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 扫描完成！发现 {len(nodes)} 个节点")
    print(f"📁 配置文件已保存到: {clash_file}")
    
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n❌ 用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 发生错误: {e}")
        sys.exit(1)