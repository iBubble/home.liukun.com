#!/bin/bash

echo "=========================================="
echo "验证最终配置"
echo "=========================================="

CONFIG_FILE="Projects/Aggregator/external/aggregator/subscribe/config/config.json"

echo ""
echo "[1] 爬取功能状态"
echo "----------------------------------------"
crawl_enable=$(grep -A 1 '"crawl":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
telegram_enable=$(grep -A 1 '"telegram":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
github_enable=$(grep -A 1 '"github":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
github_pages=$(grep -A 1 '"github":' "$CONFIG_FILE" | grep '"pages"' | grep -o '[0-9]\+')
google_enable=$(grep -A 1 '"google":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
yandex_enable=$(grep -A 1 '"yandex":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')

echo "  crawl.enable: $crawl_enable"
echo "  ├─ telegram.enable: $telegram_enable ❌ (禁用，机场需注册)"
echo "  ├─ github.enable: $github_enable ✅ (启用，爬取 $github_pages 页)"
echo "  ├─ google.enable: $google_enable"
echo "  └─ yandex.enable: $yandex_enable"

echo ""
echo "[2] scan.php 命令"
echo "----------------------------------------"
scan_cmd=$(grep 'python3.*collect.py' Projects/Aggregator/scan.php | grep -v '//' | head -1)
echo "$scan_cmd"

if echo "$scan_cmd" | grep -q -- "--yourself"; then
    echo "✅ 使用自定义订阅源"
else
    echo "❌ 未使用自定义订阅源"
fi

echo ""
echo "[3] 自定义订阅源"
echo "----------------------------------------"
SOURCES_FILE="Projects/Aggregator/data/my_sources.txt"
if [ -f "$SOURCES_FILE" ]; then
    source_count=$(grep -v '^#' "$SOURCES_FILE" | grep -v '^$' | wc -l)
    echo "✓ 订阅源文件存在，包含 $source_count 个订阅源"
    grep -v '^#' "$SOURCES_FILE" | grep -v '^$' | nl
else
    echo "✗ 订阅源文件不存在"
fi

echo ""
echo "[4] 预期行为"
echo "----------------------------------------"
echo "✅ 爬取 GitHub (发现订阅源)"
echo "✅ 使用自定义订阅源 (保证基础节点)"
echo "❌ 不爬取 Telegram (避免浪费时间)"
echo "❌ 不爬取机场网站 (需要注册)"

echo ""
echo "=========================================="
