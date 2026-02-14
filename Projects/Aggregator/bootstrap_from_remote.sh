#!/bin/bash
# 节点引导脚本 - 从远程MacBook获取初始节点
# 使用方法: 在MacBook上运行此脚本,将节点推送到服务器

REMOTE_SERVER="gemini@home.liukun.com"
REMOTE_PORT="22"
REMOTE_PATH="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"

echo "=========================================="
echo "  节点引导脚本 - 从MacBook推送节点"
echo "=========================================="
echo ""

# 1. 在本地(MacBook)获取节点
echo "📥 步骤1: 从公开订阅源获取节点..."
TEMP_FILE="/tmp/bootstrap_nodes_$(date +%s).txt"

# 尝试多个公开订阅源
SOURCES=(
    "https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2"
    "https://raw.githubusercontent.com/freefq/free/master/v2"
    "https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt"
    "https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray"
)

for url in "${SOURCES[@]}"; do
    echo "  尝试: $url"
    if curl -s -m 15 "$url" >> "$TEMP_FILE"; then
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

NODE_COUNT=$(wc -l < "$TEMP_FILE")
echo "✅ 成功获取 $NODE_COUNT 行数据"
echo ""

# 2. 解析节点(简单验证)
echo "🔍 步骤2: 验证节点格式..."
VALID_NODES=$(grep -E "^(vmess|vless|trojan|ss|ssr|hysteria2|hy2)://" "$TEMP_FILE" | wc -l)
echo "✅ 发现 $VALID_NODES 个有效节点"
echo ""

if [ "$VALID_NODES" -eq 0 ]; then
    echo "❌ 错误: 没有发现有效的节点格式"
    exit 1
fi

# 3. 创建种子节点文件
echo "📦 步骤3: 创建种子节点文件..."
SEED_FILE="/tmp/seed_proxies_$(date +%s).json"

# 提取前20个节点并转换为JSON格式
echo "[" > "$SEED_FILE"
grep -E "^(vmess|vless|trojan|ss|ssr|hysteria2|hy2)://" "$TEMP_FILE" | head -20 | while IFS= read -r line; do
    # 简单的JSON格式(服务器端会重新解析)
    echo "  {\"raw\": \"$line\", \"latency\": 999}," >> "$SEED_FILE"
done
# 移除最后一个逗号
sed -i '' '$ s/,$//' "$SEED_FILE" 2>/dev/null || sed -i '$ s/,$//' "$SEED_FILE"
echo "]" >> "$SEED_FILE"

echo "✅ 种子节点文件已创建"
echo ""

# 4. 推送到服务器
echo "🚀 步骤4: 推送到服务器..."
echo "  目标: $REMOTE_SERVER:$REMOTE_PATH"

# 推送种子节点文件
if scp -P "$REMOTE_PORT" "$SEED_FILE" "$REMOTE_SERVER:$REMOTE_PATH/seed_proxies.json"; then
    echo "  ✅ seed_proxies.json 已推送"
else
    echo "  ❌ 推送失败"
    exit 1
fi

# 推送原始节点数据(备用)
if scp -P "$REMOTE_PORT" "$TEMP_FILE" "$REMOTE_SERVER:$REMOTE_PATH/bootstrap_nodes.txt"; then
    echo "  ✅ bootstrap_nodes.txt 已推送"
else
    echo "  ⚠️ 备用文件推送失败(非致命)"
fi

echo ""

# 5. 在服务器上触发导入
echo "🔄 步骤5: 触发服务器导入..."
ssh -p "$REMOTE_PORT" "$REMOTE_SERVER" "cd $REMOTE_PATH && node -e \"
const fs = require('fs');
const path = require('path');

console.log('开始导入种子节点...');

// 读取种子节点
const seedFile = 'seed_proxies.json';
if (!fs.existsSync(seedFile)) {
    console.log('❌ 种子节点文件不存在');
    process.exit(1);
}

const seeds = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
console.log('✅ 读取到', seeds.length, '个种子节点');

// 触发全网抓取
console.log('🚀 触发全网抓取...');
const http = require('http');
const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/fetch_all',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('✅ 服务器响应:', data);
    });
});

req.on('error', (e) => {
    console.log('❌ 请求失败:', e.message);
});

req.write(JSON.stringify({ pages: 10 }));
req.end();
\""

echo ""
echo "=========================================="
echo "  ✅ 引导完成!"
echo "=========================================="
echo ""
echo "下一步:"
echo "  1. 等待5-10分钟让服务器完成节点抓取"
echo "  2. 访问 https://home.liukun.com:8443/Projects/Aggregator/"
echo "  3. 查看节点数量和状态"
echo ""
echo "建议:"
echo "  - 将此脚本添加到crontab,每天自动运行一次"
echo "  - 例如: 0 2 * * * /path/to/bootstrap_from_remote.sh"
echo ""

# 清理临时文件
rm -f "$TEMP_FILE" "$SEED_FILE"
