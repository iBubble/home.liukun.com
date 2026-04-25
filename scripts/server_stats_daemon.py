import os
import sys
import re
import socket
import json
import time
import subprocess
from concurrent.futures import ThreadPoolExecutor

CONFIG_FILE = "/www/wwwroot/ibubble.vicp.net/Servers/server-config.md"
TARGET_SERVERS = [
    "home.liukun.com", 
    "hk.liukun.com", 
    "sg.liukun.com", 
    "us.liukun.com", 
    "b.liukun.com",
    "ubuntu.syhsgis.com", 
    "frp.syhsgis.com"
]
CACHE_FILE = "/www/wwwroot/ibubble.vicp.net/api/servers_cache.json"
SEMAPHORE_FILE = "/tmp/force_fetch_servers_stats"

POLL_INTERVAL = 300
DEBOUNCE_INTERVAL = 10

def parse_ssh_config(config_path):
    configs = {}
    current_host = None
    try:
        if not os.path.exists(config_path):
            return configs
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
                    if key.lower() == 'identityfile' and val.startswith('/Users/'):
                        val = val.replace('/Users/gemini/', '/home/gemini/')
                    elif key.lower() == 'identityfile' and val.startswith('~/'):
                        val = val.replace('~/', '/home/gemini/')
                    configs[current_host][key.lower()] = val
    except Exception as e:
        print(f"Error parsing SSH config: {e}")
    return configs

def get_real_hostname_and_params(hostname_query, ssh_configs):
    for host, conf in ssh_configs.items():
        if host == 'sy_frp_server' and hostname_query == 'frp.syhsgis.com':
            return conf
        if host == 'gemini-server' and hostname_query == 'home.liukun.com':
            return conf
        if conf.get('hostname') == hostname_query or host == hostname_query:
            return conf
    return {}

def run_ssh_command(host, port, user, key_file, command):
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

def parse_server_stats(output):
    stats = {
        'cpu_usage': 0, 'mem_usage': 0, 'disk_usage': 0,
        'uptime_days': 0, 'uptime_secs': 0, 'status': 'Online'
    }
    try:
        lines = output.strip().split('\n')
        for i, line in enumerate(lines):
            try:
                if line.startswith('UPTIME:'):
                    uptime_secs = float(line.split(':')[1])
                    stats['uptime_secs'] = uptime_secs
                    stats['uptime_days'] = round(uptime_secs / 86400, 2)
                elif line.startswith('TOP_CPU:'):
                    val = float(line.split(':')[1])
                    stats['cpu_usage'] = round(val, 1)
                elif line.startswith('MEM:'):
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

def get_local_stats():
    stats = {'status': 'Offline'}
    try:
        result = subprocess.run(["php", "/www/wwwroot/ibubble.vicp.net/api/server-stats.php"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout:
            try:
                json_str = result.stdout[result.stdout.find('{'):]
                data = json.loads(json_str)
                stats = {
                    'status': 'Online',
                    'cpu_usage': data.get('cpu', {}).get('usage', 0),
                    'mem_usage': data.get('memory', {}).get('usage', 0),
                    'disk_usage': data.get('disk', {}).get('usage', 0),
                    'uptime_days': round((data.get('system', {}).get('uptime', {}).get('seconds', 0)) / 86400, 2),
                    'uptime_secs': data.get('system', {}).get('uptime', {}).get('seconds', 0),
                    'ping_ms': 0.0
                }
                
                try:
                    pass
                except: pass
            except: pass
    except: pass
    return stats

def get_ping(host, port=22):
    try:
        start_time = time.time()
        with socket.create_connection((host, int(port)), timeout=2):
            pass
        return round((time.time() - start_time) * 1000, 1)
    except: pass
    return None

def fetch_single_server(server, ssh_configs, old_cache, old_time, current_time):
    bash_stat = """
echo "UPTIME:$(awk '{print $1}' /proc/uptime)"
echo "TOP_CPU:$((grep -m1 '^cpu ' /proc/stat; sleep 1; grep -m1 '^cpu ' /proc/stat) | awk 'NR==1 {u1=$2; n1=$3; s1=$4; id1=$5; io1=$6; ir1=$7; si1=$8} NR==2 {u2=$2; n2=$3; s2=$4; id2=$5; io2=$6; ir2=$7; si2=$8; total=(u2-u1)+(n2-n1)+(s2-s1)+(id2-id1)+(io2-io1)+(ir2-ir1)+(si2-si1); idle=(id2-id1)+(io2-io1); if(total>0) printf "%.1f", (total-idle)/total*100; else print 0}')"
echo "MEM:$(free -b | awk '/Mem:/{print $2 " " $7}')" 
echo "DISK:$(df -P -x tmpfs -x devtmpfs -x squashfs -x overlay -l | awk 'NR>1 {u+=$3; t+=$2} END {if(t>0) printf \"%.1f\", (u/t)*100; else print 0}')"
"""
    if server == 'home.liukun.com':
        return server, get_local_stats()
        
    conf = get_real_hostname_and_params(server, ssh_configs)
    ssh_host = conf.get('hostname', server)
    ssh_port = conf.get('port', 22)
    ssh_user = conf.get('user', 'root')
    ssh_key = conf.get('identityfile', '')

    success, output = run_ssh_command(ssh_host, ssh_port, ssh_user, ssh_key, bash_stat)
    
    server_data = {'status': 'Offline', 'error': output if not success else '', 'ping_ms': get_ping(ssh_host, ssh_port)}
    if success and 'UPTIME' in output:
        server_data.update(parse_server_stats(output))
            
    return server, server_data

def execute_fetch(servers_list):
    ssh_configs = parse_ssh_config(CONFIG_FILE)
    full_cache_data = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                full_cache_data = json.load(f)
        except: pass

    old_servers = full_cache_data.get('servers', {})
    old_time = full_cache_data.get('last_update', current_time - 1)
    
    # We always use multi-threading, even for 1 server
    with ThreadPoolExecutor(max_workers=len(servers_list)) as executor:
        futures = {executor.submit(fetch_single_server, srv, ssh_configs, old_servers, old_time, current_time): srv for srv in servers_list}
        for future in futures:
            srv, s_data = future.result()
            # update only the targeted servers
            old_servers[srv] = s_data

    final_output = {
        'last_update': current_time,
        'datetime': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(current_time)),
        'servers': old_servers
    }
    
    tmp_cache = CACHE_FILE + ".tmp"
    with open(tmp_cache, 'w') as f:
        json.dump(final_output, f)
    os.rename(tmp_cache, CACHE_FILE)
    
    print(f"[{final_output['datetime']}] Fetched specific nodes: {servers_list}")

def main():
    print("Daemon started. Polling every 300s. Semaphore checks every 1s.")
    last_fetch_time = 0
    server_fetch_times = {s: 0 for s in TARGET_SERVERS}
    
    while True:
        current_time = time.time()
        trigger_full = False
        trigger_partial = set()
        
        # 1. 检查信号量
        if os.path.exists(SEMAPHORE_FILE):
            lines = []
            try:
                with open(SEMAPHORE_FILE, 'r') as f:
                    lines = f.readlines()
                os.remove(SEMAPHORE_FILE)
            except: pass
            
            for line in lines:
                srv = line.strip()
                if srv == 'ALL':
                    if current_time - last_fetch_time > DEBOUNCE_INTERVAL:
                        trigger_full = True
                elif srv in TARGET_SERVERS:
                    # Individual debounce of 5 seconds to prevent single-server spam
                    if current_time - server_fetch_times.get(srv, 0) > 5:
                        trigger_partial.add(srv)
        
        # 2. 检查定时周期
        elif current_time - last_fetch_time >= POLL_INTERVAL:
            trigger_full = True
            
        if trigger_full:
            print("Force/Regular FULL poll triggered.")
            try:
                execute_fetch(TARGET_SERVERS)
                last_fetch_time = time.time()
                for s in TARGET_SERVERS:
                    server_fetch_times[s] = last_fetch_time
            except Exception as e:
                print(f"Full Fetch error: {e}")
        elif trigger_partial:
            # We fetch a subset of servers
            print(f"Partial sync triggered for {trigger_partial}")
            try:
                execute_fetch(list(trigger_partial))
                for s in trigger_partial:
                    server_fetch_times[s] = time.time()
            except Exception as e:
                print(f"Partial Fetch error: {e}")
                
        time.sleep(1)

if __name__ == '__main__':
    main()
