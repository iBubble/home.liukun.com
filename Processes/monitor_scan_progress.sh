#!/bin/bash

# 监控扫描进度

LOG_FILE="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log"

echo "=== 监控扫描进度 ==="
echo ""

while true; do
    clear
    echo "=== Aggregator 扫描进度监控 ==="
    echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    if [ -f "$LOG_FILE" ]; then
        # 任务总数
        tasks=$(grep "start generate subscribes information, tasks:" "$LOG_FILE" | tail -1 | awk '{print $NF}')
        echo "📊 任务总数: $tasks"
        
        # 已完成的任务
        finished=$(grep -c "finished fetch proxy" "$LOG_FILE")
        echo "✅ 已完成: $finished"
        
        # 找到的节点数
        found=$(grep "found.*proxies" "$LOG_FILE" | tail -1 | awk '{print $2}')
        if [ -n "$found" ]; then
            echo "🎯 找到节点: $found"
        fi
        
        # 最新日志
        echo ""
        echo "📝 最新日志:"
        tail -5 "$LOG_FILE" | grep -v "ERROR"
        
        # 检查是否完成
        if grep -q "found.*proxies" "$LOG_FILE"; then
            echo ""
            echo "✅ 扫描已完成！"
            break
        fi
    else
        echo "⏳ 等待扫描开始..."
    fi
    
    sleep 3
done

echo ""
echo "=== 监控结束 ==="
