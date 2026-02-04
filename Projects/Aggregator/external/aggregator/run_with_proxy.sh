#!/bin/bash
# 通过环境变量设置 SOCKS5 代理运行 collect.py

# 读取代理配置
PROXY_CONFIG="../../data/proxy_config.json"

if [ -f "$PROXY_CONFIG" ]; then
    PROXY_HOST=$(grep -oP '"host":\s*"\K[^"]+' "$PROXY_CONFIG")
    PROXY_PORT=$(grep -oP '"port":\s*"\K[^"]+' "$PROXY_CONFIG")
    PROXY_USER=$(grep -oP '"username":\s*"\K[^"]+' "$PROXY_CONFIG")
    PROXY_PASS=$(grep -oP '"password":\s*"\K[^"]+' "$PROXY_CONFIG")
    
    # 设置代理环境变量
    export ALL_PROXY="socks5://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}"
    export HTTP_PROXY="$ALL_PROXY"
    export HTTPS_PROXY="$ALL_PROXY"
    export http_proxy="$ALL_PROXY"
    export https_proxy="$ALL_PROXY"
    
    echo "[代理] 已设置代理: $PROXY_HOST:$PROXY_PORT" >&2
fi

# 切换到 subscribe 目录并运行 collect.py
cd subscribe
python3 collect.py "$@"
