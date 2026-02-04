#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
节点检测脚本
检测节点的连通性和IP纯净度
"""

import sys
import json
import socket
import time
import requests
from concurrent.futures import ThreadPoolExecutor, TimeoutError

# 超时设置
CONNECT_TIMEOUT = 5
REQUEST_TIMEOUT = 10

def check_connectivity(server, port):
    """
    检测节点连通性
    返回: (是否可连接, 延迟ms)
    """
    try:
        start_time = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(CONNECT_TIMEOUT)
        
        result = sock.connect_ex((server, int(port)))
        
        end_time = time.time()
        latency = int((end_time - start_time) * 1000)
        
        sock.close()
        
        if result == 0:
            return True, latency
        else:
            return False, -1
            
    except socket.gaierror:
        return False, -1
    except socket.timeout:
        return False, -1
    except Exception as e:
        return False, -1

def check_ip_purity(server):
    """
    检测IP纯净度
    检查IP是否在黑名单、是否被标记为代理等
    """
    try:
        # 方法1: 检查IP信息
        response = requests.get(
            f'http://ip-api.com/json/{server}',
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # 检查是否为代理、VPN、托管服务器
            if data.get('hosting') or data.get('proxy'):
                return '代理IP'
            
            # 检查是否为移动网络
            if data.get('mobile'):
                return '移动网络'
            
            # 检查ISP信息
            isp = data.get('isp', '')
            if any(keyword in isp.lower() for keyword in ['datacenter', 'hosting', 'cloud', 'server']):
                return '数据中心'
            
            return '纯净'
        else:
            return '未知'
            
    except requests.exceptions.Timeout:
        return '检测超时'
    except Exception as e:
        return '检测失败'

def check_node(server, port):
    """
    综合检测节点
    """
    result = {
        'available': False,
        'latency': '-',
        'purity': '-',
        'details': ''
    }
    
    # 1. 检测连通性
    is_connected, latency = check_connectivity(server, port)
    
    if not is_connected:
        result['details'] = '无法连接到服务器'
        return result
    
    result['latency'] = f'{latency}ms'
    
    # 2. 检测IP纯净度
    purity = check_ip_purity(server)
    result['purity'] = purity
    
    # 3. 判断是否可用
    # 如果能连接且IP相对纯净，则认为可用
    if is_connected and purity in ['纯净', '未知', '移动网络']:
        result['available'] = True
        result['details'] = '节点可用'
    else:
        result['available'] = False
        result['details'] = f'IP纯净度: {purity}'
    
    return result

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': '参数不足'
        }))
        sys.exit(1)
    
    server = sys.argv[1]
    port = sys.argv[2]
    
    try:
        result = check_node(server, port)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            'available': False,
            'error': str(e)
        }, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    main()
