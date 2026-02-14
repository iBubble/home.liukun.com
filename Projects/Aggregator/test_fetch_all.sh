#!/bin/bash
# 测试完整的节点获取流程

echo "=========================================="
echo "  测试全网节点获取流程"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# 检查必要文件
echo "检查必要文件..."

if [ ! -f "linuxdo_cookie.txt" ]; then
    echo "❌ Cookie文件不存在: linuxdo_cookie.txt"
    exit 1
fi

if [ ! -f "clash_bin/clash-linux-amd64" ]; then
    echo "❌ Clash二进制不存在"
    exit 1
fi

echo "✓ 必要文件检查通过"
echo ""

# 运行节点获取
echo "开始获取节点..."
echo ""

node fetch_all_nodes.js

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "=========================================="
    echo "✅ 测试成功！"
    echo "=========================================="
    echo ""
    echo "查看获取的节点："
    echo "  ls -lh fetched_nodes/"
    echo ""
    echo "节点统计："
    if [ -f "fetched_nodes/all_nodes.json" ]; then
        TOTAL=$(grep -o '"name"' fetched_nodes/all_nodes.json | wc -l)
        echo "  总节点数: $TOTAL"
    fi
else
    echo "=========================================="
    echo "❌ 测试失败 (退出码: $EXIT_CODE)"
    echo "=========================================="
fi

exit $EXIT_CODE
