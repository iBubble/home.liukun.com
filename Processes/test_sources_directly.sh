#!/bin/bash

echo "=========================================="
echo "直接测试订阅源"
echo "=========================================="

SOURCES_FILE="Projects/Aggregator/data/my_sources.txt"

# 读取订阅源
sources=$(grep -v '^#' "$SOURCES_FILE" | grep -v '^$')

i=1
total_nodes=0

while IFS= read -r url; do
    echo ""
    echo "[$i] 测试订阅源"
    echo "----------------------------------------"
    echo "URL: $url"
    
    # 下载订阅内容
    content=$(curl -s -m 10 "$url" 2>&1)
    
    if [ $? -eq 0 ] && [ -n "$content" ]; then
        # 尝试检测内容类型
        if echo "$content" | head -1 | grep -q "^http"; then
            # 订阅源列表
            count=$(echo "$content" | grep -c "^http")
            echo "✓ 类型: 订阅源列表"
            echo "✓ 包含订阅数: $count"
        elif echo "$content" | grep -q "proxies:"; then
            # Clash YAML格式
            count=$(echo "$content" | grep -c "^  - {name:")
            echo "✓ 类型: Clash YAML"
            echo "✓ 节点数: $count"
            total_nodes=$((total_nodes + count))
        elif echo "$content" | grep -q "vmess://\|ss://\|trojan://\|vless://"; then
            # Base64编码的节点列表
            count=$(echo "$content" | grep -oE "(vmess|ss|trojan|vless)://" | wc -l)
            echo "✓ 类型: 节点列表"
            echo "✓ 节点数: $count"
            total_nodes=$((total_nodes + count))
        else
            echo "✗ 未知格式"
            echo "内容预览:"
            echo "$content" | head -5
        fi
    else
        echo "✗ 无法访问或超时"
    fi
    
    i=$((i + 1))
done <<< "$sources"

echo ""
echo "=========================================="
echo "总计预估节点数: $total_nodes"
echo "=========================================="
