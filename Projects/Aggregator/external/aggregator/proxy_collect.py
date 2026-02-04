#!/usr/bin/env python3
"""
代理包装脚本 - 为collect.py添加SOCKS5代理支持
使用方法: python3 proxy_collect.py [collect.py的参数]

这个脚本通过monkey patching socket模块来实现全局代理
支持代理连接失败时自动回退到直连模式
"""
import sys
import os
import socket
import socket as original_socket

def test_proxy_connection(host, port, username=None, password=None, timeout=5):
    """测试代理连接是否可用"""
    try:
        import socks
        
        # 创建测试socket - 强制使用 IPv4
        test_sock = socks.socksocket(socket.AF_INET, socket.SOCK_STREAM)
        test_sock.set_proxy(
            socks.SOCKS5,
            host,
            int(port),
            username=username if username else None,
            password=password if password else None
        )
        test_sock.settimeout(timeout)
        
        # 尝试连接一个公共DNS服务器
        test_sock.connect(('8.8.8.8', 53))
        test_sock.close()
        return True
    except Exception as e:
        print(f"[警告] 代理连接测试失败: {e}", file=sys.stderr)
        return False

# 读取代理配置
config_file = os.path.join(os.path.dirname(__file__), '../../data/proxy_config.json')
proxy_enabled = False

if os.path.exists(config_file):
    import json
    with open(config_file, 'r') as f:
        proxy_config = json.load(f)
    
    if proxy_config.get('enable') and proxy_config.get('type') == 'socks5':
        try:
            import socks
            
            proxy_host = proxy_config.get('host')
            proxy_port = int(proxy_config.get('port'))
            proxy_user = proxy_config.get('username') if proxy_config.get('username') else None
            proxy_pass = proxy_config.get('password') if proxy_config.get('password') else None
            
            print(f"[代理] 正在测试代理连接: {proxy_host}:{proxy_port}", file=sys.stderr)
            
            # 测试代理连接
            if test_proxy_connection(proxy_host, proxy_port, proxy_user, proxy_pass):
                # 代理可用，启用代理
                socks.set_default_proxy(
                    socks.SOCKS5,
                    proxy_host,
                    proxy_port,
                    username=proxy_user,
                    password=proxy_pass
                )
                
                # 创建一个强制使用 IPv4 的 socket 包装函数
                _original_getaddrinfo = socket.getaddrinfo
                def getaddrinfo_ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
                    """强制只返回 IPv4 地址"""
                    return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
                
                socket.getaddrinfo = getaddrinfo_ipv4_only
                
                def create_ipv4_socket(family=socket.AF_INET, type=socket.SOCK_STREAM, proto=0, fileno=None):
                    """强制使用 IPv4 的 socket 创建函数"""
                    # 忽略 family 参数，总是使用 AF_INET (IPv4)
                    return socks.socksocket(socket.AF_INET, type, proto, fileno)
                
                # 替换socket
                original_socket.socket = create_ipv4_socket
                proxy_enabled = True
                
                print(f"[代理] ✓ SOCKS5代理已启用: {proxy_host}:{proxy_port} (强制IPv4)", file=sys.stderr)
            else:
                # 代理不可用，使用直连
                print(f"[代理] ✗ 代理连接失败，自动切换到直连模式", file=sys.stderr)
                proxy_enabled = False
                
        except ImportError:
            print("[警告] PySocks未安装，无法使用SOCKS5代理", file=sys.stderr)
            print("[提示] 运行: pip3 install PySocks --break-system-packages", file=sys.stderr)
        except Exception as e:
            print(f"[警告] 代理设置失败: {e}，使用直连模式", file=sys.stderr)

# 修改sys.path以便导入collect模块
subscribe_dir = os.path.join(os.path.dirname(__file__), 'subscribe')
if subscribe_dir not in sys.path:
    sys.path.insert(0, subscribe_dir)

# 导入并运行collect.py
if __name__ == '__main__':
    try:
        # 切换到subscribe目录
        collect_dir = os.path.join(os.path.dirname(__file__), 'subscribe')
        os.chdir(collect_dir)
        
        # 将subscribe目录添加到sys.path
        if collect_dir not in sys.path:
            sys.path.insert(0, collect_dir)
        
        # 直接导入collect模块并运行
        import collect
        
    except Exception as e:
        print(f"[错误] 执行失败: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


