#!/bin/bash
# 安全扫描脚本 - 确保连接失败不会导致整个扫描失败

set +e  # 不要在错误时退出

PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
DATA_DIR="$PROJECT_DIR/data"
LOGS_DIR="$PROJECT_DIR/logs"
AGGREGATOR_DIR="$PROJECT_DIR/external/aggregator"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/safe_scan.log"
}

log "=========================================="
log "开始安全扫描"
log "=========================================="

# 检查代理配置
PROXY_CONFIG="$DATA_DIR/proxy_config.json"
if [ -f "$PROXY_CONFIG" ]; then
    PROXY_ENABLED=$(jq -r '.enable' "$PROXY_CONFIG" 2>/dev/null || echo "false")
    if [ "$PROXY_ENABLED" = "true" ]; then
        PROXY_HOST=$(jq -r '.host' "$PROXY_CONFIG")
        PROXY_PORT=$(jq -r '.port' "$PROXY_CONFIG")
        log "代理已启用: $PROXY_HOST:$PROXY_PORT"
    else
        log "使用直连模式"
    fi
else
    log "未找到代理配置，使用直连模式"
fi

# 切换到aggregator目录
cd "$AGGREGATOR_DIR" || {
    log "错误: 无法切换到aggregator目录"
    exit 1
}

# 设置Python环境变量
export PYTHONPATH="$AGGREGATOR_DIR"
export PYTHONUNBUFFERED=1

# 设置超时时间（30分钟）
TIMEOUT=1800

log "开始执行扫描脚本..."

# 使用timeout命令限制执行时间
if [ -f "$PROXY_CONFIG" ] && [ "$PROXY_ENABLED" = "true" ]; then
    # 使用代理
    log "使用代理模式扫描"
    timeout $TIMEOUT python3 proxy_collect.py --skip --overwrite --pages 10 --num 128 --targets clash --all 2>&1 | tee -a "$LOGS_DIR/safe_scan.log" || {
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log "警告: 扫描超时（${TIMEOUT}秒），但可能已收集到部分节点"
        else
            log "警告: 扫描过程出现错误（退出码: $EXIT_CODE），但可能已收集到部分节点"
        fi
    }
else
    # 直连模式
    log "使用直连模式扫描"
    timeout $TIMEOUT python3 subscribe/collect.py --skip --overwrite --pages 10 --num 128 --targets clash --all 2>&1 | tee -a "$LOGS_DIR/safe_scan.log" || {
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log "警告: 扫描超时（${TIMEOUT}秒），但可能已收集到部分节点"
        else
            log "警告: 扫描过程出现错误（退出码: $EXIT_CODE），但可能已收集到部分节点"
        fi
    }
fi

# 检查是否有生成的YAML文件
YAML_FILE="$AGGREGATOR_DIR/data/clash.yaml"
if [ -f "$YAML_FILE" ]; then
    YAML_NODE_COUNT=$(grep -c "^  - {name:" "$YAML_FILE" 2>/dev/null || echo "0")
    log "✓ 扫描完成，YAML文件包含 $YAML_NODE_COUNT 个节点"
    
    # 复制到项目data目录
    cp "$YAML_FILE" "$DATA_DIR/clash.yaml" 2>/dev/null || log "警告: 无法复制YAML文件"
    
    # 解析节点
    log "开始解析节点..."
    cd "$PROJECT_DIR"
    python3 parse_nodes.py 2>&1 | tee -a "$LOGS_DIR/safe_scan.log" || {
        log "警告: 节点解析失败，但YAML文件已生成"
    }
    
    # 检查JSON文件
    if [ -f "$DATA_DIR/nodes.json" ]; then
        JSON_NODE_COUNT=$(jq '. | length' "$DATA_DIR/nodes.json" 2>/dev/null || echo "0")
        log "✓ 节点解析完成，JSON文件包含 $JSON_NODE_COUNT 个有效节点"
    else
        log "警告: nodes.json 未生成"
    fi
else
    log "警告: 未找到生成的YAML文件，扫描可能失败"
    log "提示: 这可能是因为网络连接问题或所有来源都无法访问"
fi

log "=========================================="
log "扫描流程结束"
log "=========================================="

# 总是返回成功，即使部分失败
exit 0
