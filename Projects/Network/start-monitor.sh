#!/bin/bash
# 网络监测守护进程启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON_SCRIPT="$SCRIPT_DIR/monitor-daemon.php"
PID_FILE="$SCRIPT_DIR/logs/daemon.pid"
LOG_FILE="$SCRIPT_DIR/logs/daemon.log"

# 检查是否已在运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "守护进程已在运行 (PID: $PID)"
        exit 0
    fi
fi

# 启动守护进程
nohup php "$DAEMON_SCRIPT" > "$LOG_FILE" 2>&1 &
NEW_PID=$!

# 保存PID
echo $NEW_PID > "$PID_FILE"

echo "守护进程已启动 (PID: $NEW_PID)"
