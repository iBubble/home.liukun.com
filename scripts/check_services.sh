#!/bin/bash

# 服务状态检查脚本
# 用于检查所有关键服务的运行状态和开机自启动配置

echo "=========================================="
echo "服务状态检查报告"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 定义需要检查的服务列表
SERVICES=(
    "nginx:Nginx Web服务器"
    "mysqld:MySQL数据库"
    "php-fpm-82:PHP-FPM 8.2"
    "pm2-gemini:PM2进程管理器"
)

# 检查服务状态
echo "1. 服务运行状态"
echo "----------------------------------------"
for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service desc <<< "$service_info"
    status=$(systemctl is-active "$service" 2>/dev/null || echo "未找到")
    enabled=$(systemctl is-enabled "$service" 2>/dev/null | grep -o "enabled\|disabled" || echo "未知")
    
    if [ "$status" = "active" ]; then
        status_icon="✅"
    else
        status_icon="❌"
    fi
    
    if [ "$enabled" = "enabled" ]; then
        enabled_icon="✅"
    else
        enabled_icon="❌"
    fi
    
    printf "%-20s %s 运行状态: %s %-10s | 开机自启: %s %-10s\n" \
        "$desc" "$status_icon" "$status_icon" "$status" "$enabled_icon" "$enabled"
done

echo ""
echo "2. PM2 管理的进程"
echo "----------------------------------------"
pm2 list

echo ""
echo "3. PM2 进程详情"
echo "----------------------------------------"
pm2_processes=$(pm2 jlist 2>/dev/null)
if [ -n "$pm2_processes" ] && [ "$pm2_processes" != "[]" ]; then
    echo "$pm2_processes" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for proc in data:
        name = proc.get('name', 'unknown')
        status = proc.get('pm2_env', {}).get('status', 'unknown')
        restart = proc.get('pm2_env', {}).get('restart_time', 0)
        uptime = proc.get('pm2_env', {}).get('pm_uptime', 0)
        
        status_icon = '✅' if status == 'online' else '❌'
        print(f'{status_icon} {name:20s} - 状态: {status:10s} | 重启次数: {restart:3d}')
except:
    print('无法解析PM2进程信息')
"
else
    echo "没有运行中的PM2进程"
fi

echo ""
echo "4. Clash 状态检查"
echo "----------------------------------------"
clash_process=$(ps aux | grep -E "clash.*yaml" | grep -v grep)
if [ -n "$clash_process" ]; then
    echo "✅ Clash 正在运行"
    echo "$clash_process" | awk '{print "   PID: "$2" | 内存: "$6"KB | 命令: "$11" "$12" "$13}'
else
    echo "❌ Clash 未运行"
fi

echo ""
echo "5. 端口监听状态"
echo "----------------------------------------"
PORTS=(
    "8443:HTTPS主站"
    "3000:AIMovie API"
    "3001:Aggregator API"
    "3002:Validator API"
    "7890:Clash HTTP代理"
    "7891:Clash SOCKS5代理"
    "9090:Clash API"
)

for port_info in "${PORTS[@]}"; do
    IFS=':' read -r port desc <<< "$port_info"
    listening=$(ss -tuln | grep ":$port " | wc -l)
    
    if [ "$listening" -gt 0 ]; then
        echo "✅ 端口 $port ($desc) - 正在监听"
    else
        echo "❌ 端口 $port ($desc) - 未监听"
    fi
done

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
