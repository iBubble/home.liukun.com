#!/bin/bash

echo "========== 下载最新版Clash Meta =========="
echo ""

cd clash_bin || exit 1

# 备份旧版本
if [ -f "clash-linux-amd64" ]; then
    echo "📦 备份旧版本..."
    mv clash-linux-amd64 clash-linux-amd64.old
fi

# 下载最新版 Clash Meta (使用国内镜像源)
echo "⬇️  下载最新版 Clash Meta (使用国内镜像)..."

# 尝试多个国内镜像源
MIRRORS=(
    "https://mirror.ghproxy.com/https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-linux-amd64-v1.18.10"
    "https://ghproxy.net/https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-linux-amd64-v1.18.10"
    "https://gh-proxy.com/https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-linux-amd64-v1.18.10"
    "https://github.moeyy.xyz/https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-linux-amd64-v1.18.10"
)

SUCCESS=0
for mirror in "${MIRRORS[@]}"; do
    echo "尝试: $mirror"
    if curl -L --connect-timeout 10 --max-time 120 -o clash-linux-amd64 "$mirror"; then
        SUCCESS=1
        break
    fi
    echo "失败，尝试下一个镜像..."
done

if [ $SUCCESS -eq 0 ]; then
    echo "❌ 所有镜像源均失败"
    exit 1
fi

if [ -f "clash-linux-amd64" ]; then
    chmod +x clash-linux-amd64
    echo "✅ 下载完成"
    echo ""
    echo "版本信息:"
    ./clash-linux-amd64 -v
else
    echo "❌ 下载失败，恢复旧版本"
    mv clash-linux-amd64.old clash-linux-amd64
    exit 1
fi
