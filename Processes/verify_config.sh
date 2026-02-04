#!/bin/bash

echo "=========================================="
echo "验证 Aggregator 配置"
echo "=========================================="

CONFIG_FILE="Projects/Aggregator/external/aggregator/subscribe/config/config.json"

echo ""
echo "[1] 检查配置文件..."
if [ ! -f "$CONFIG_FILE" ]; then
    echo "✗ 配置文件不存在: $CONFIG_FILE"
    exit 1
fi

echo "✓ 配置文件存在"

echo ""
echo "[2] 检查爬取功能状态..."
crawl_enable=$(grep -A 1 '"crawl":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
telegram_enable=$(grep -A 1 '"telegram":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')
github_enable=$(grep -A 1 '"github":' "$CONFIG_FILE" | grep '"enable"' | grep -o 'true\|false')

echo "  crawl.enable: $crawl_enable"
echo "  telegram.enable: $telegram_enable"
echo "  github.enable: $github_enable"

if [ "$crawl_enable" = "false" ] && [ "$telegram_enable" = "false" ] && [ "$github_enable" = "false" ]; then
    echo "✓ 所有爬取功能已禁用"
else
    echo "✗ 还有爬取功能未禁用"
    exit 1
fi

echo ""
echo "[3] 检查订阅源文件..."
SOURCES_FILE="Projects/Aggregator/data/my_sources.txt"
if [ ! -f "$SOURCES_FILE" ]; then
    echo "✗ 订阅源文件不存在: $SOURCES_FILE"
    exit 1
fi

source_count=$(grep -v '^#' "$SOURCES_FILE" | grep -v '^$' | wc -l)
echo "✓ 订阅源文件存在，包含 $source_count 个订阅源"

echo ""
echo "[4] 显示订阅源列表..."
grep -v '^#' "$SOURCES_FILE" | grep -v '^$' | nl

echo ""
echo "=========================================="
echo "✓ 配置验证完成"
echo "=========================================="
