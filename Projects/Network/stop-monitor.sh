#!/bin/bash
# 网络监测守护进程停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/daemon.pid"

# 检查PID文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo "守护进程未运行"
    exit 0
fi

# 读取PID
PID=$(cat "$PID_FILE")

# 检查进程是否存在
if ! ps -p $PID > /dev/null 2>&1; then
    echo "守护进程未运行 (PID文件存在但进程不存在)"
    rm -f "$PID_FILE"
    exit 0
fi

# 停止进程
kill $PID

# 等待进程结束
for i in {1..10}; do
    if ! ps -p $PID > /dev/null 2>&1; then
        echo "守护进程已停止"
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# 如果还没停止，强制杀死
kill -9 $PID 2>/dev/null
rm -f "$PID_FILE"
echo "守护进程已强制停止"
