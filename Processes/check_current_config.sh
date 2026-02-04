#!/bin/bash

echo "=========================================="
echo "检查当前 Aggregator 配置"
echo "=========================================="

CONFIG_FILE="Projects/Aggregator/external/aggregator/subscribe/config/config.json"

echo ""
echo "[1] 爬取功能状态"
echo "----------------------------------------"
crawl_enable=$(grep -A 1 '"crawl":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
telegram_enable=$(grep -A 1 '"telegram":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
telegram_pages=$(grep '"pages":' "$CONFIG_FILE" | head -1 | grep -o '[0-9]\+')
github_enable=$(grep -A 1 '"github":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
github_pages=$(grep -A 1 '"github":' "$CONFIG_FILE" | grep '"pages"' | grep -o '[0-9]\+')

echo "  crawl.enable: $crawl_enable"
echo "  telegram.enable: $telegram_enable (pages: $telegram_pages)"
echo "  github.enable: $github_enable (pages: $github_pages)"

echo ""
echo "[2] scan.php 命令参数"
echo "----------------------------------------"
grep -A 2 'python3.*collect.py' Projects/Aggregator/scan.php | grep -v '^--' | head -3

echo ""
echo "[3] 预期行为"
echo "----------------------------------------"
echo "✓ 会爬取 GitHub (最多 $github_pages 页)"
echo "✓ 会爬取 Telegram jichang_list (最多 $telegram_pages 页)"
echo "✓ 使用 --overwrite 强制爬取，不依赖已有订阅"
echo "✓ 使用 200 线程高速扫描"
echo "✓ 跳过节点可用性检查 (--skip)"

echo ""
echo "[4] 当前节点数"
echo "----------------------------------------"
if [ -f "Projects/Aggregator/data/nodes.json" ]; then
    node_count=$(grep -o '"name":' Projects/Aggregator/data/nodes.json | wc -l)
    echo "  当前节点数: $node_count"
else
    echo "  无节点数据"
fi

echo ""
echo "=========================================="
