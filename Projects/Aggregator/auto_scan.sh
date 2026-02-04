#!/bin/bash
# 机场聚合器自动扫描脚本
# 每6小时执行一次完整扫描

# 配置
PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
AGGREGATOR_DIR="$PROJECT_DIR/external/aggregator"
LOG_DIR="$PROJECT_DIR/logs"
DATA_DIR="$PROJECT_DIR/data"
TASK_LOG="$LOG_DIR/auto_scan.log"
SCAN_LOG="$LOG_DIR/scan_output.log"
PID_FILE="$DATA_DIR/scan_task.pid"

# 确保日志目录存在
mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$TASK_LOG"
}

# 开始扫描
log "=========================================="
log "开始自动扫描任务"
log "=========================================="

# 检查是否有扫描任务正在运行
if pgrep -f "collect.py" > /dev/null; then
    log "⚠️  警告: 已有扫描任务正在运行，跳过本次扫描"
    exit 0
fi

# 进入 aggregator 目录
cd "$AGGREGATOR_DIR" || {
    log "❌ 错误: 无法进入目录 $AGGREGATOR_DIR"
    exit 1
}

log "📂 工作目录: $(pwd)"

# 执行扫描
log "🚀 开始扫描机场节点..."
log "📊 扫描参数: --skip --overwrite --pages 10 --num 128 --targets clash --all"
log "📡 启用所有爬取来源以获取最多节点"

# 记录开始时间
START_TIME=$(date +%s)

# 执行扫描并记录输出，同时保存PID
# 检查是否有代理配置
PROXY_CONFIG="$DATA_DIR/proxy_config.json"
if [ -f "$PROXY_CONFIG" ]; then
    PROXY_ENABLED=$(jq -r '.enable // false' "$PROXY_CONFIG" 2>/dev/null)
    if [ "$PROXY_ENABLED" = "true" ]; then
        PROXY_TYPE=$(jq -r '.type // "socks5"' "$PROXY_CONFIG")
        PROXY_HOST=$(jq -r '.host // ""' "$PROXY_CONFIG")
        PROXY_PORT=$(jq -r '.port // ""' "$PROXY_CONFIG")
        log "🔒 检测到代理配置: $PROXY_TYPE://$PROXY_HOST:$PROXY_PORT"
        log "📡 将通过代理扫描节点（如代理不通将自动切换到直连）"
        COLLECT_SCRIPT="proxy_collect.py"
    else
        log "📡 未启用代理，使用直连模式"
        COLLECT_SCRIPT="subscribe/collect.py"
    fi
else
    log "📡 未配置代理，使用直连模式"
    COLLECT_SCRIPT="subscribe/collect.py"
fi

# 使用真正的扫描脚本
# --skip: 跳过测速（后续单独验证）
# --overwrite: 覆盖现有文件
# --pages 10: 爬取10页Telegram频道（增加节点数量）
# --num 128: 使用128个线程（加快扫描速度）
# --targets clash: 生成Clash配置
# --all: 生成完整配置
python3 $COLLECT_SCRIPT \
    --skip \
    --overwrite \
    --pages 10 \
    --num 128 \
    --targets clash \
    --all \
    >> "$SCAN_LOG" 2>&1 &

# 保存扫描进程PID
SCAN_PID=$!
echo $SCAN_PID > "$PID_FILE"
log "📝 扫描进程PID: $SCAN_PID"

# 等待扫描完成
wait $SCAN_PID
SCAN_EXIT_CODE=$?

# 清理PID文件
rm -f "$PID_FILE"

# 记录结束时间
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

if [ $SCAN_EXIT_CODE -eq 0 ]; then
    log "✅ 扫描完成，耗时: ${MINUTES}分${SECONDS}秒"
else
    log "❌ 扫描失败，退出码: $SCAN_EXIT_CODE"
    log "📄 查看详细日志: $SCAN_LOG"
    exit 1
fi

# 检查生成的文件
log "📁 检查生成的数据文件..."

CLASH_YAML="$AGGREGATOR_DIR/data/clash.yaml"
if [ -f "$CLASH_YAML" ]; then
    # 支持两种格式的节点计数
    NODE_COUNT_1=$(grep -c "^  - name:" "$CLASH_YAML" 2>/dev/null || echo "0")
    NODE_COUNT_2=$(grep -c "^  - {name:" "$CLASH_YAML" 2>/dev/null || echo "0")
    NODE_COUNT=$((NODE_COUNT_1 > NODE_COUNT_2 ? NODE_COUNT_1 : NODE_COUNT_2))
    FILE_SIZE=$(du -h "$CLASH_YAML" | cut -f1)
    log "✅ clash.yaml 已生成: $FILE_SIZE, 节点数: $NODE_COUNT"
    
    # 复制到项目 data 目录
    cp "$CLASH_YAML" "$DATA_DIR/clash.yaml"
    log "📋 已复制到: $DATA_DIR/clash.yaml"
else
    log "⚠️  警告: clash.yaml 未生成"
fi

# 解析节点数据
log "🔄 开始解析节点数据..."
cd "$PROJECT_DIR" || exit 1

python3 parse_nodes.py >> "$TASK_LOG" 2>&1
PARSE_EXIT_CODE=$?

if [ $PARSE_EXIT_CODE -eq 0 ]; then
    log "✅ 节点数据解析完成"
    
    # 检查 nodes.json
    if [ -f "$DATA_DIR/nodes.json" ]; then
        JSON_NODE_COUNT=$(jq '. | length' "$DATA_DIR/nodes.json" 2>/dev/null || echo "0")
        log "📊 nodes.json 节点数: $JSON_NODE_COUNT"
    fi
else
    log "❌ 节点数据解析失败"
fi

# 自动检测节点纯净度
log "🛡️  开始检测节点纯净度..."
PURITY_RESPONSE=$(curl -s -X POST "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/check-purity" 2>&1)
if echo "$PURITY_RESPONSE" | grep -q '"success":true'; then
    PURITY_COUNT=$(echo "$PURITY_RESPONSE" | jq -r '.checked_count' 2>/dev/null || echo "0")
    log "✅ 纯净度检测完成，已检测 $PURITY_COUNT 个节点"
else
    log "⚠️  纯净度检测失败，继续后续流程"
fi

# 自动生成订阅链接(使用前50个最快节点，不受前端勾选影响)
log "🔗 开始生成订阅链接..."
SUBSCRIPTION_RESPONSE=$(curl -s -X POST "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/generate-subscription" \
    -H "Content-Type: application/json" \
    -d '{"selected_nodes": []}' 2>&1)
if echo "$SUBSCRIPTION_RESPONSE" | grep -q '"success":true'; then
    SUBSCRIPTION_COUNT=$(echo "$SUBSCRIPTION_RESPONSE" | jq -r '.node_count' 2>/dev/null || echo "0")
    log "✅ 订阅链接已生成，包含前 $SUBSCRIPTION_COUNT 个最快节点"
    log "📎 订阅地址: https://home.liukun.com:8443/Projects/Aggregator/subscription.php"
else
    log "⚠️  订阅链接生成失败"
fi

# 更新状态文件
log "📝 更新状态信息..."
STATUS_FILE="$DATA_DIR/status.json"
cat > "$STATUS_FILE" << EOF
{
  "last_update": "$(date -Iseconds)",
  "last_scan_duration": ${DURATION},
  "node_count": ${JSON_NODE_COUNT:-0},
  "scan_success": true,
  "auto_scan": true
}
EOF

log "✅ 状态文件已更新: $STATUS_FILE"

# 清理旧日志（保留最近7天）
log "🧹 清理旧日志文件..."
find "$LOG_DIR" -name "*.log" -type f -mtime +7 -delete
log "✅ 旧日志清理完成"

# 统计信息
log "=========================================="
log "📊 扫描统计"
log "=========================================="
log "⏱️  扫描耗时: ${MINUTES}分${SECONDS}秒"
log "📦 节点总数: ${JSON_NODE_COUNT:-0}"
log "📅 完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
log "=========================================="
log "✅ 自动扫描任务完成"
log "=========================================="

exit 0
