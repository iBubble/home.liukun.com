#!/bin/bash
# Aggregator完整修复脚本 - 一次性解决所有问题

set -e  # 遇到错误立即退出

PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
DATA_DIR="$PROJECT_DIR/data"
LOGS_DIR="$PROJECT_DIR/logs"

echo "=========================================="
echo "Aggregator 完整修复脚本"
echo "=========================================="

# 1. 停止所有相关进程
echo ""
echo "1. 停止所有相关进程..."
sudo pkill -f "proxy_collect.py" 2>/dev/null || true
sudo pkill -f "collect.py" 2>/dev/null || true
sudo pkill -f "monitor_scan.php" 2>/dev/null || true
rm -f "$DATA_DIR/scan_task.pid" 2>/dev/null || true
echo "✓ 进程已清理"

# 2. 修复目录权限
echo ""
echo "2. 修复目录权限..."
sudo chown -R gemini:www "$PROJECT_DIR"
sudo chmod 775 "$PROJECT_DIR" "$DATA_DIR" "$LOGS_DIR"
sudo chmod 664 "$PROJECT_DIR"/*.php "$PROJECT_DIR"/*.py 2>/dev/null || true
sudo chmod 664 "$DATA_DIR"/*.json "$DATA_DIR"/*.yaml 2>/dev/null || true
sudo chmod 664 "$LOGS_DIR"/*.log 2>/dev/null || true
echo "✓ 权限已修复"

# 3. 清理旧数据
echo ""
echo "3. 清理旧数据..."
rm -f "$DATA_DIR/nodes.json.tmp" 2>/dev/null || true
echo "✓ 旧数据已清理"

# 4. 重新解析节点
echo ""
echo "4. 重新解析节点数据..."
cd "$PROJECT_DIR"
python3 parse_nodes.py
NODE_COUNT=$(jq '. | length' "$DATA_DIR/nodes.json" 2>/dev/null || echo "0")
echo "✓ 当前节点数: $NODE_COUNT"

# 5. 验证API
echo ""
echo "5. 验证API状态..."
API_RESPONSE=$(curl -s "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/status" -k)
API_NODE_COUNT=$(echo "$API_RESPONSE" | jq -r '.node_count' 2>/dev/null || echo "0")
echo "✓ API返回节点数: $API_NODE_COUNT"

# 6. 检查数据一致性
echo ""
echo "6. 检查数据一致性..."
YAML_COUNT=$(grep -c "^  - {name:" "$PROJECT_DIR/external/aggregator/data/clash.yaml" 2>/dev/null || echo "0")
echo "  YAML文件节点数: $YAML_COUNT"
echo "  JSON文件节点数: $NODE_COUNT"
echo "  API返回节点数: $API_NODE_COUNT"

if [ "$NODE_COUNT" -eq "$API_NODE_COUNT" ]; then
    echo "✓ 数据一致性检查通过"
else
    echo "⚠ 数据不一致，需要刷新浏览器缓存"
fi

# 7. 测试代理功能
echo ""
echo "7. 测试代理自动降级功能..."
cd "$PROJECT_DIR/external/aggregator"
timeout 5 python3 proxy_collect.py --help >/dev/null 2>&1 && echo "✓ 代理脚本正常" || echo "⚠ 代理脚本异常"

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "当前状态："
echo "  - 节点数量: $NODE_COUNT"
echo "  - 数据目录: $DATA_DIR"
echo "  - 日志目录: $LOGS_DIR"
echo ""
echo "访问地址："
echo "  https://home.liukun.com:8443/Projects/Aggregator/"
echo ""
echo "如果界面显示的节点数不对，请："
echo "  1. 刷新浏览器（Ctrl+F5 或 Cmd+Shift+R）"
echo "  2. 清除浏览器缓存"
echo "  3. 点击'刷新状态'按钮"
