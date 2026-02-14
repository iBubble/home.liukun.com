#!/bin/bash
# MacBook端脚本 - 获取节点并推送到服务器
# 使用方法: 在MacBook上运行此脚本

SERVER_URL="https://home.liukun.com:8443/Projects/Aggregator/api/bootstrap"

echo "=========================================="
echo "  节点推送脚本 (MacBook → 服务器)"
echo "=========================================="
echo ""

# 1. 获取节点
echo "📥 步骤1: 从公开订阅源获取节点..."
TEMP_FILE="/tmp/nodes_$(date +%s).txt"

# 尝试多个公开订阅源
SOURCES=(
    "https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2"
    "https://raw.githubusercontent.com/freefq/free/master/v2"
    "https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt"
    "https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray"
    "https://raw.githubusercontent.com/ts-sf/fly/main/v2"
)

for url in "${SOURCES[@]}"; do
    echo "  尝试: $url"
    if timeout 15 curl -s "$url" >> "$TEMP_FILE" 2>/dev/null; then
        echo "  ✅ 成功"
    else
        echo "  ❌ 失败"
    fi
done

# 检查是否获取到数据
if [ ! -s "$TEMP_FILE" ]; then
    echo "❌ 错误: 未能从任何订阅源获取节点"
    exit 1
fi

echo "✅ 成功获取数据"
echo ""

# 2. 提取有效节点
echo "🔍 步骤2: 提取有效节点..."
VALID_NODES=$(grep -E "^(vmess|vless|trojan|ss|ssr|hysteria2|hy2)://" "$TEMP_FILE")
NODE_COUNT=$(echo "$VALID_NODES" | wc -l | tr -d ' ')

if [ "$NODE_COUNT" -eq 0 ]; then
    echo "❌ 错误: 没有发现有效的节点"
    rm -f "$TEMP_FILE"
    exit 1
fi

echo "✅ 发现 $NODE_COUNT 个有效节点"
echo ""

# 3. 构建JSON数据
echo "📦 步骤3: 构建JSON数据..."
JSON_FILE="/tmp/nodes_$(date +%s).json"

echo "{" > "$JSON_FILE"
echo "  \"source\": \"MacBook自动推送\"," >> "$JSON_FILE"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$JSON_FILE"
echo "  \"nodes\": [" >> "$JSON_FILE"

# 取前30个节点
echo "$VALID_NODES" | head -30 | while IFS= read -r line; do
    # 转义引号
    escaped=$(echo "$line" | sed 's/"/\\"/g')
    echo "    \"$escaped\"," >> "$JSON_FILE"
done

# 移除最后一个逗号
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' '$ s/,$//' "$JSON_FILE"
else
    sed -i '$ s/,$//' "$JSON_FILE"
fi

echo "  ]" >> "$JSON_FILE"
echo "}" >> "$JSON_FILE"

echo "✅ JSON数据已构建 ($(wc -l < "$JSON_FILE") 行)"
echo ""

# 4. 推送到服务器
echo "🚀 步骤4: 推送到服务器..."
echo "  目标: $SERVER_URL"
echo ""

RESPONSE=$(curl -k -s -X POST "$SERVER_URL" \
    -H "Content-Type: application/json" \
    -d @"$JSON_FILE" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 推送成功!"
    echo ""
    echo "服务器响应:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
    echo "❌ 推送失败 (HTTP $HTTP_CODE)"
    echo "$BODY"
    rm -f "$TEMP_FILE" "$JSON_FILE"
    exit 1
fi

echo ""
echo "=========================================="
echo "  ✅ 完成!"
echo "=========================================="
echo ""
echo "下一步:"
echo "  1. 服务器将自动开始抓取节点"
echo "  2. 等待5-10分钟"
echo "  3. 访问 https://home.liukun.com:8443/Projects/Aggregator/"
echo ""
echo "自动化建议:"
echo "  添加到crontab每天运行:"
echo "  0 2 * * * $0 >> /tmp/node_push.log 2>&1"
echo ""

# 清理
rm -f "$TEMP_FILE" "$JSON_FILE"
