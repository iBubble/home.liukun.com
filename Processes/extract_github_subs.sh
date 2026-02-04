#!/bin/bash
# 从 GitHub 提取订阅链接

echo "=== 从 GitHub 提取订阅链接 ==="

export HTTP_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"
export HTTPS_PROXY="socks5://Gemini:Gl5181081@us.liukun.com:1080"

# 临时文件
temp_file="/tmp/github_subs_$$.txt"
> "$temp_file"

# GitHub 源列表
sources=(
    "https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt"
    "https://raw.githubusercontent.com/freefq/free/master/v2"
    "https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2"
)

echo "正在下载并提取订阅链接..."
for url in "${sources[@]}"; do
    echo "处理: $url"
    # 下载内容并提取 http/https 链接
    curl -s --max-time 30 "$url" | grep -oE "https?://[^\s<>\"']+" >> "$temp_file"
done

# 去重并过滤
echo ""
echo "提取到的订阅链接:"
sort -u "$temp_file" | grep -E "^https?://" | head -20

echo ""
echo "总计: $(sort -u "$temp_file" | grep -E "^https?://" | wc -l) 个链接"

# 保存到 subscribes.txt
sort -u "$temp_file" | grep -E "^https?://" > Projects/Aggregator/external/aggregator/data/subscribes.txt

rm -f "$temp_file"

echo ""
echo "已保存到 subscribes.txt"
