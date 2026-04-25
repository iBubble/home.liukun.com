import os
import sys
import json
import time
import subprocess
import re
import socket
import concurrent.futures

CONFIG_FILE = "/www/wwwroot/ibubble.vicp.net/Servers/server-config.md"
TARGET_SERVERS = [
    "home.liukun.com", 
    "hk.liukun.com", 
    "hk1.liukun.com", 
    "sg.liukun.com", 
    "us.liukun.com", 
    "b.liukun.com",
    "ubuntu.syhsgis.com", 
    "frp.syhsgis.com"
]
CACHE_FILE = "/www/wwwroot/ibubble.vicp.net/api/servers_cache.json"

def parse_ssh_config(config_path):
    configs = {}
    current_host = None
    try:
        with open(config_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                parts = line.split(None, 1)
                if len(parts) < 2:
                    continue
                key, val = parts[0], parts[1]
                if key.lower() == 'host':
                    current_host = val
                    configs[current_host] = {}
                elif current_host:
                    # Fix identity file path if from Mac env
                    if key.lower() == 'identityfile' and val.startswith('/Users/'):
                        val = val.replace('/Users/gemini/', '/home/gemini/')
                    elif key.lower() == 'identityfile' and val.startswith('~/'):
                        val = val.replace('~/', '/home/gemini/')
                    configs[current_host][key.lower()] = val
    except Exception as e:
        print(f"Error parsing SSH config: {e}")
    return configs

def get_real_hostname_and_params(hostname_query, ssh_configs):
    # Lookup in configs by Host
    for host, conf in ssh_configs.items():
        if host == 'sy_frp_server' and hostname_query == 'frp.syhsgis.com':
            return conf
        if host == 'gemini-server' and hostname_query == 'home.liukun.com':
            return conf
        if conf.get('hostname') == hostname_query or host == hostname_query:
            return conf
    return {}

def run_ssh_command(host, port, user, key_file, command):
    # Timeout after 8 seconds per server to avoid hangs
    ssh_cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5", "-o", "PasswordAuthentication=no"
    ]
    if port:
        ssh_cmd.extend(["-p", str(port)])
    if key_file:
        ssh_cmd.extend(["-i", key_file])
    ssh_cmd.append(f"{user}@{host}")
    ssh_cmd.append(command)
    
    try:
        result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=8)
        return result.returncode == 0, result.stdout
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)

def parse_server_stats(output, current_rx_tx=None):
    # We output text in specific sections from bash command
    stats = {
        'cpu_usage': 0, 'mem_usage': 0, 'disk_usage': 0,
        'uptime_days': 0, 'uptime_secs': 0, 'status': 'Online',
        'ping_ms': 0.0
    }
    
    try:
        lines = output.strip().split('\n')
        for i, line in enumerate(lines):
            try:
                if line.startswith('UPTIME:'):
                    uptime_secs = float(line.split(':')[1])
                    stats['uptime_secs'] = uptime_secs
                    stats['uptime_days'] = round(uptime_secs / 86400, 2)
                elif line.startswith('CPU:'):
                    # cpu_diff = total - idle diffs, simplified approach is to use top
                    # or we read it directly from 'top' Output. We'll use top output below.
                    pass
                elif line.startswith('TOP_CPU:'):
                    # "TOP_CPU: 10.5 us, 3.2 sy" or similar
                    val = float(line.split(':')[1])
                    stats['cpu_usage'] = round(val, 1)
                elif line.startswith('MEM:'):
                    # total used free
                    parts = line.split(':')[1].split()
                    if len(parts) >= 2:
                        total = float(parts[0])
                        available = float(parts[1])
                        stats['mem_usage'] = round((1 - available/total)*100, 1) if total > 0 else 0
                elif line.startswith('DISK:'):
                    val = line.split(':')[1].strip()
                    stats['disk_usage'] = float(val) if val else 0.0
            except:
                continue
    except Exception as e:
        stats['status'] = f'Error parsing'
        
    return stats

def get_ping(host, port=22):
    try:
        # 如果是本地地址，直接返回 0
        if host in ['127.0.0.1', 'localhost', 'home.liukun.com']:
            return 0.0
            
        start_time = time.time()
        # 为了绕过本地透明代理（如 Clash/V2Ray）的立即 TCP 响应，
        # 我们必须读取服务端返回的第一个字节（SSH Banner），确保经历真实的网络往返。
        s = socket.create_connection((host, int(port)), timeout=5)
        s.settimeout(5)
        s.recv(1) 
        latency = round((time.time() - start_time) * 1000, 1)
        s.close()
        
        return latency
    except:
        return 0.0

def get_local_stats():
    # Fetch local server stats through the existing PHP script or locally parsing
    stats = {'status': 'Offline'}
    try:
        result = subprocess.run(["php", "/www/wwwroot/ibubble.vicp.net/api/server-stats.php"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout:
            # Maybe the output is cached json directly?
            try:
                # We need to find { in case there are warnings
                json_str = result.stdout[result.stdout.find('{'):]
                data = json.loads(json_str)
                stats = {
                    'status': 'Online',
                    'cpu_usage': data.get('cpu', {}).get('usage', 0),
                    'mem_usage': data.get('memory', {}).get('usage', 0),
                    'disk_usage': data.get('disk', {}).get('usage', 0),
                    'uptime_days': round((data.get('system', {}).get('uptime', {}).get('seconds', 0)) / 86400, 2),
                    'uptime_secs': data.get('system', {}).get('uptime', {}).get('seconds', 0),
                    'rx_total': data.get('network', {}).get('rx_total', 0)*1024*1024*1024,
                    'tx_total': data.get('network', {}).get('tx_total', 0)*1024*1024*1024,
                    'rx_rate': data.get('network', {}).get('rx_rate', 0),
                    'tx_rate': data.get('network', {}).get('tx_rate', 0),
                    'ping_ms': 0.0
                }
            except:
                pass
    except:
        pass
    return stats


def main():
    ssh_configs = parse_ssh_config(CONFIG_FILE)
    
    # Check old cache to calculate network rate
    old_cache = {}
    current_time = time.time()
    old_time = 0
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                data = json.load(f)
                old_cache = data.get('servers', {})
                old_time = data.get('last_update', current_time - 1)
        except:
            pass
    results = {}
    
    # Bash script to run on remote to get all stats quickly
    bash_stat = """
echo "UPTIME:$(awk '{print $1}' /proc/uptime)"
echo "TOP_CPU:$((grep -m1 '^cpu ' /proc/stat; sleep 1; grep -m1 '^cpu ' /proc/stat) | awk 'NR==1 {u1=$2; n1=$3; s1=$4; id1=$5; io1=$6; ir1=$7; si1=$8} NR==2 {u2=$2; n2=$3; s2=$4; id2=$5; io2=$6; ir2=$7; si2=$8; total=(u2-u1)+(n2-n1)+(s2-s1)+(id2-id1)+(io2-io1)+(ir2-ir1)+(si2-si1); idle=(id2-id1)+(io2-io1); if(total>0) printf "%.1f", (total-idle)/total*100; else print 0}')"
echo "MEM:$(free -b | awk '/Mem:/{print $2 " " $7}')" 
echo "DISK:$(df -P -x tmpfs -x devtmpfs -x squashfs -x overlay -x fuse.cosfs -x fuse -l | awk 'NR>1 {u+=$3; t+=$2} END {if(t>0) printf \"%.1f\", (u/t)*100; else print 0}')"
"""

    # Pre-resolve hostnames to avoid DNS latency in ping measurements
    host_ips = {}
    for srv in TARGET_SERVERS:
        try:
            if srv == 'home.liukun.com': host_ips[srv] = '127.0.0.1'
            else:
                conf = get_real_hostname_and_params(srv, ssh_configs)
                target = conf.get('hostname', srv)
                host_ips[srv] = socket.gethostbyname(target)
        except:
            host_ips[srv] = srv

    def fetch_stats(server):
        ip = host_ips.get(server, server)
        if server == 'home.liukun.com':
            return server, get_local_stats()
            
        conf = get_real_hostname_and_params(server, ssh_configs)
        
        # Determine connection params
        ssh_host = conf.get('hostname', server)
        ssh_port = conf.get('port', 22)
        ssh_user = conf.get('user', 'root')
        ssh_key = conf.get('identityfile', '')

        # Use IP for ping to get real RTT
        server_data = {}
        success, output = run_ssh_command(ssh_host, ssh_port, ssh_user, ssh_key, bash_stat)
        
        if success and 'UPTIME' in output:
            server_data = parse_server_stats(output)
            server_data['ping_ms'] = get_ping(ip, ssh_port)
            return server, server_data
        else:
            # Still try to get ping even if SSH fails
            ping_ms = get_ping(ip, ssh_port)
            return server, {'status': 'Offline', 'error': output, 'ping_ms': ping_ms}

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_server = {executor.submit(fetch_stats, srv): srv for srv in TARGET_SERVERS}
        for future in concurrent.futures.as_completed(future_to_server):
            srv = future_to_server[future]
            try:
                srv, srv_data = future.result()
                results[srv] = srv_data
            except Exception as e:
                results[srv] = {'status': 'Offline', 'error': str(e), 'ping_ms': 0.0}

    # Prepare final output
    final_output = {
        'last_update': current_time,
        'datetime': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(current_time)),
        'servers': results
    }
    
    with open(CACHE_FILE, 'w') as f:
        json.dump(final_output, f)

if __name__ == '__main__':
    main()
