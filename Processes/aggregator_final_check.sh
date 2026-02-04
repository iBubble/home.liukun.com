#!/bin/bash
# Aggregator 最终检查清单

echo "=========================================="
echo "Aggregator 最终检查清单"
echo "=========================================="
echo ""

PASS=0
FAIL=0

check() {
    local name="$1"
    local command="$2"
    
    echo -n "检查: $name ... "
    if eval "$command" > /dev/null 2>&1; then
        echo "✅ 通过"
        ((PASS++))
        return 0
    else
        echo "❌ 失败"
        ((FAIL++))
        return 1
    fi
}

# 1. 文件存在性检查
echo "=== 文件存在性检查 ==="
check "配置文件" "test -f Projects/Aggregator/external/aggregator/subscribe/config/config.json"
check "代理脚本" "test -f Projects/Aggregator/external/aggregator/proxy_collect.py"
check "解析脚本" "test -f Projects/Aggregator/parse_nodes.py"
check "安全扫描脚本" "test -f Projects/Aggregator/safe_scan.sh"
check "API文件" "test -f Projects/Aggregator/api/index.php"
echo ""

# 2. 权限检查
echo "=== 权限检查 ==="
check "data目录可写" "test -w Projects/Aggregator/data"
check "脚本可执行" "test -x Projects/Aggregator/safe_scan.sh"
check "parse_nodes.py可执行" "test -r Projects/Aggregator/parse_nodes.py"
echo ""

# 3. Python依赖检查
echo "=== Python依赖检查 ==="
check "PyYAML" "python3 -c 'import yaml' 2>/dev/null"
check "requests" "python3 -c 'import requests' 2>/dev/null"
check "PySocks" "python3 -c 'import socks' 2>/dev/null"
echo ""

# 4. 配置检查
echo "=== 配置检查 ==="
REPO_COUNT=$(jq '.crawl.repositories | length' Projects/Aggregator/external/aggregator/subscribe/config/config.json 2>/dev/null || echo "0")
PAGE_COUNT=$(jq '.crawl.pages | length' Projects/Aggregator/external/aggregator/subscribe/config/config.json 2>/dev/null || echo "0")
echo "  GitHub仓库来源: $REPO_COUNT 个"
echo "  直接URL来源: $PAGE_COUNT 个"
if [ "$REPO_COUNT" -ge 10 ]; then
    echo "  ✅ 仓库来源充足"
    ((PASS++))
else
    echo "  ⚠️  仓库来源较少"
    ((FAIL++))
fi
echo ""

# 5. 数据文件检查
echo "=== 数据文件检查 ==="
if [ -f "Projects/Aggregator/data/nodes.json" ]; then
    NODE_COUNT=$(jq '. | length' Projects/Aggregator/data/nodes.json 2>/dev/null || echo "0")
    NODE_OWNER=$(stat -c "%U:%G" Projects/Aggregator/data/nodes.json)
    NODE_PERM=$(stat -c "%a" Projects/Aggregator/data/nodes.json)
    echo "  节点数量: $NODE_COUNT"
    echo "  文件所有者: $NODE_OWNER"
    echo "  文件权限: $NODE_PERM"
    
    if [ "$NODE_OWNER" = "www:www" ] && [ "$NODE_PERM" = "666" ]; then
        echo "  ✅ 权限配置正确"
        ((PASS++))
    else
        echo "  ⚠️  权限需要修复"
        ((FAIL++))
    fi
else
    echo "  ⚠️  nodes.json 不存在"
    ((FAIL++))
fi
echo ""

# 6. API测试
echo "=== API测试 ==="
API_URL="https://home.liukun.com:8443/Projects/Aggregator/api/index.php"

# 测试状态API
STATUS=$(curl -s "$API_URL?path=/status" 2>/dev/null)
if echo "$STATUS" | jq -e '.node_count' > /dev/null 2>&1; then
    API_NODE_COUNT=$(echo "$STATUS" | jq -r '.node_count')
    echo "  API节点数: $API_NODE_COUNT"
    echo "  ✅ 状态API正常"
    ((PASS++))
else
    echo "  ❌ 状态API异常"
    ((FAIL++))
fi
echo ""

# 7. Cron任务检查
echo "=== Cron任务检查 ==="
CRON_COUNT=$(crontab -l 2>/dev/null | grep -c "aggregator\|Aggregator")
echo "  已配置的cron任务: $CRON_COUNT 个"
if [ "$CRON_COUNT" -ge 2 ]; then
    echo "  ✅ Cron任务已配置"
    ((PASS++))
else
    echo "  ⚠️  Cron任务配置不完整"
    ((FAIL++))
fi
echo ""

# 8. 用户配置检查
echo "=== 用户配置检查 ==="
UMASK_SET=$(grep -c "umask 002" ~/.bashrc 2>/dev/null || echo "0")
if [ "$UMASK_SET" -gt 0 ]; then
    echo "  ✅ umask已配置"
    ((PASS++))
else
    echo "  ⚠️  umask未配置"
    ((FAIL++))
fi
echo ""

# 总结
echo "=========================================="
echo "检查完成"
echo "=========================================="
echo ""
echo "通过: $PASS 项"
echo "失败: $FAIL 项"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 所有检查通过！系统已准备就绪"
    exit 0
else
    echo "⚠️  有 $FAIL 项检查失败，请修复后再进行扫描"
    exit 1
fi
