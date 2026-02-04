#!/bin/bash
# 通过 API 触发扫描测试

echo "=== 触发扫描测试 ==="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 清空旧日志
> /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log

# 触发扫描
curl -s "http://localhost/Projects/Aggregator/api/index.php?action=scan" | jq '.'

echo ""
echo "等待 3 秒..."
sleep 3

echo ""
echo "=== 扫描日志（前30行）==="
head -30 /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log
