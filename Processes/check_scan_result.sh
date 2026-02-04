#!/bin/bash
# 检查扫描结果

echo "=== 扫描进程状态 ==="
ps aux | grep -E "collect\.py" | grep -v grep | wc -l

echo ""
echo "=== 最新扫描日志（最后20行）==="
tail -20 /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log

echo ""
echo "=== 已找到的节点数 ==="
grep "found.*proxies" /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log | tail -3

echo ""
echo "=== 当前YAML文件节点数 ==="
grep -c "^  - name:" /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator/data/clash.yaml 2>/dev/null || echo "0"

echo ""
echo "=== 订阅源加载情况 ==="
grep "load exists subscription" /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/real_scan.log | tail -3
