#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 Clash 核心进行真实节点检测
重要：本脚本不使用任何系统代理，直接从服务器本地网络测试到节点的连通性
"""

import sys
import json
import subprocess
import tempfile
import time
import os
import yaml
import requests
import shutil

# 超时设置
TEST_TIMEOUT = 30  # 增加到 30 秒，给节点更多连接时间

# 测试 URL - 必须使用国外网站，确保只有通过节点代理才能访问
# 如果使用国内网站（如百度），Clash 可能会直接使用本地网络，导致误判
TEST_URL = 'http://www.google.com/generate_204'
# 备用测试 URL
BACKUP_TEST_URLS = [
    'http://www.gstatic.com/generate_204',
    'http://cp.cloudflare.com/generate_204',
    'http://www.youtube.com'
]

def get_free_port():
    """
    获取一个可用的端口
    """
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

def create_clash_config(node):
    """
    创建临时 Clash 配置文件
    """
    # 获取可用端口
    http_port = get_free_port()
    socks_port = get_free_port()
    
    config = {
        'port': http_port,
        'socks-port': socks_port,
        'allow-lan': False,
        'mode': 'rule',  # 使用规则模式
        'log-level': 'silent',
        'proxies': [node],
        'proxy-groups': [{
            'name': 'test',
            'type': 'select',
            'proxies': [node['name']]
        }],
        # 强制所有流量通过代理，不使用 DIRECT
        'rules': [
            'MATCH,test'  # 所有流量都通过 test 代理组（即被测试的节点）
        ]
    }
    return config, http_port

def test_with_clash(node, clash_binary):
    """
    使用 Clash 核心测试节点
    返回: (是否可用, 延迟ms, 详情, 真实IP)
    """
    temp_config = None
    clash_process = None
    temp_dir = None
    real_ip = None
    
    try:
        # 1. 创建临时配置文件和目录
        temp_config = tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False)
        config, http_port = create_clash_config(node)
        yaml.dump(config, temp_config, allow_unicode=True)
        temp_config.close()
        
        # 创建临时目录用于 Clash 数据
        temp_dir = tempfile.mkdtemp()
        
        # 清除环境变量中的代理设置，确保 Clash 进程不使用系统代理
        env = os.environ.copy()
        env.pop('HTTP_PROXY', None)
        env.pop('HTTPS_PROXY', None)
        env.pop('http_proxy', None)
        env.pop('https_proxy', None)
        env.pop('ALL_PROXY', None)
        env.pop('all_proxy', None)
        
        # 2. 启动 Clash（不使用系统代理）
        clash_process = subprocess.Popen(
            [clash_binary, '-f', temp_config.name, '-d', temp_dir],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            preexec_fn=os.setsid if hasattr(os, 'setsid') else None
        )
        
        # 等待 Clash 启动（增加等待时间）
        time.sleep(5)  # 从 3 秒增加到 5 秒
        
        # 检查 Clash 是否还在运行
        if clash_process.poll() is not None:
            stdout, stderr = clash_process.communicate()
            error_msg = stderr.decode('utf-8', errors='ignore') if stderr else ''
            return False, -1, f'Clash启动失败: {error_msg[:100]}', None
        
        # 3. 通过 Clash 代理测试连接（这里的 proxies 是指通过 Clash 节点代理，不是系统代理）
        # 注意：这里我们要测试的是节点本身，所以必须通过 Clash 提供的代理端口
        proxies = {
            'http': f'http://127.0.0.1:{http_port}',
            'https': f'http://127.0.0.1:{http_port}'
        }
        
        # 创建一个新的 Session，确保不继承任何环境代理设置
        session = requests.Session()
        session.trust_env = False  # 关键：不信任环境变量中的代理设置
        
        start_time = time.time()
        response = session.get(
            TEST_URL,
            proxies=proxies,
            timeout=TEST_TIMEOUT
        )
        end_time = time.time()
        
        latency = int((end_time - start_time) * 1000)
        
        # 200 或 204 都表示连接成功
        if response.status_code in [200, 204]:
            # 获取真实IP
            try:
                ip_response = session.get(
                    'https://api.ipify.org?format=json',
                    proxies=proxies,
                    timeout=10
                )
                if ip_response.status_code == 200:
                    ip_data = ip_response.json()
                    real_ip = ip_data.get('ip')
            except:
                pass
            
            return True, latency, '节点可用', real_ip
        else:
            return False, -1, f'HTTP状态码: {response.status_code}', None
            
    except requests.exceptions.Timeout:
        return False, -1, '连接超时(30秒)', None
    except requests.exceptions.ProxyError as e:
        return False, -1, f'代理连接失败: {str(e)[:50]}', None
    except requests.exceptions.ConnectionError as e:
        return False, -1, f'无法连接: {str(e)[:50]}', None
    except Exception as e:
        return False, -1, f'测试失败: {str(e)[:100]}', None
    finally:
        # 清理
        if clash_process:
            try:
                clash_process.terminate()
                clash_process.wait(timeout=3)
            except:
                try:
                    clash_process.kill()
                    clash_process.wait(timeout=2)
                except:
                    pass
        
        # 清理临时文件
        if temp_config and os.path.exists(temp_config.name):
            try:
                os.unlink(temp_config.name)
            except:
                pass
        
        # 清理临时目录
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except:
                pass

def simple_connectivity_test(server, port):
    """
    简单的连通性测试（备用方案）
    """
    import socket
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        start_time = time.time()
        result = sock.connect_ex((server, int(port)))
        end_time = time.time()
        latency = int((end_time - start_time) * 1000)
        sock.close()
        
        if result == 0:
            return True, latency, 'TCP连接成功'
        else:
            return False, -1, 'TCP连接失败'
    except Exception as e:
        return False, -1, f'连接错误: {str(e)}'

def check_node(node_data, clash_binary):
    """
    检测节点
    使用 Clash 核心进行真实测试
    """
    result = {
        'available': False,
        'latency': '-',
        'real_ip': None,
        'details': ''
    }
    
    # 使用 Clash 核心测试
    clash_available, latency, details, real_ip = test_with_clash(node_data, clash_binary)
    
    if clash_available:
        result['available'] = True
        result['latency'] = f'{latency}ms'
        result['real_ip'] = real_ip
        result['details'] = details
    else:
        result['available'] = False
        result['latency'] = '-'
        result['real_ip'] = None
        result['details'] = details
    
    return result

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': '参数不足，需要: <node_json> <clash_binary_path>'
        }))
        sys.exit(1)
    
    try:
        # 从命令行参数读取节点数据（JSON格式）和 Clash 路径
        node_json = sys.argv[1]
        clash_binary = sys.argv[2]
        node_data = json.loads(node_json)
        
        result = check_node(node_data, clash_binary)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            'available': False,
            'error': str(e)
        }, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    main()
