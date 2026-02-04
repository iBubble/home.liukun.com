#!/bin/bash
# 安装 Clash 核心用于节点真实测试

echo "================================"
echo "安装 Clash 核心"
echo "================================"
echo ""

# 检测系统架构
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        CLASH_ARCH="amd64"
        ;;
    aarch64|arm64)
        CLASH_ARCH="armv8"
        ;;
    armv7l)
        CLASH_ARCH="armv7"
        ;;
    *)
        echo "❌ 不支持的架构: $ARCH"
        exit 1
        ;;
esac

echo "系统架构: $ARCH -> Clash架构: $CLASH_ARCH"
echo ""

# 下载 Clash Premium（使用最新版本）
# Clash Premium 已停止更新，使用最后一个稳定版本
CLASH_VERSION="2023.08.17"
GITHUB_URL="https://github.com/Dreamacro/clash/releases/download/premium/clash-linux-${CLASH_ARCH}-${CLASH_VERSION}.gz"

# 备用下载地址（Clash Meta）
META_VERSION="v1.18.0"
META_URL="https://github.com/MetaCubeX/mihomo/releases/download/${META_VERSION}/mihomo-linux-${CLASH_ARCH}-${META_VERSION}.gz"

# 创建 bin 目录
mkdir -p bin

# 代理配置
PROXY_HOST="us.liukun.com"
PROXY_PORT="1080"
PROXY_USER="Gemini"
PROXY_PASS="Gl5181081"
PROXY_URL="socks5://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}"

# 下载源列表（按优先级）
DOWNLOAD_URLS=(
    "${META_URL}|mihomo"
    "${GITHUB_URL}|clash"
)

echo "开始下载 Clash 核心..."
DOWNLOAD_SUCCESS=false

# 首先尝试使用代理从 GitHub 直接下载
for URL_INFO in "${DOWNLOAD_URLS[@]}"; do
    IFS='|' read -r URL NAME <<< "$URL_INFO"
    
    echo ""
    echo "尝试下载: ${NAME}"
    echo "URL: ${URL}"
    echo "使用代理: ${PROXY_HOST}:${PROXY_PORT}"
    
    # 使用 wget 通过 SOCKS5 代理下载（支持断点续传）
    export ALL_PROXY="${PROXY_URL}"
    export all_proxy="${PROXY_URL}"
    
    if wget -O bin/clash.gz "${URL}" --timeout=60 --tries=3 --continue 2>&1 | tee /tmp/wget.log; then
        # 检查文件是否有效
        if [ -f bin/clash.gz ] && file bin/clash.gz | grep -q "gzip compressed"; then
            DOWNLOAD_SUCCESS=true
            echo "✅ 通过代理下载成功: ${NAME}"
            break
        else
            echo "❌ 下载的文件格式不正确"
            if [ -f bin/clash.gz ]; then
                ls -lh bin/clash.gz
                file bin/clash.gz
            fi
        fi
    else
        echo "❌ 代理下载失败"
    fi
    
    # 清理环境变量
    unset ALL_PROXY
    unset all_proxy
done

if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo ""
    echo "❌ 所有下载方式都失败了"
    echo "请手动下载 Clash 并放置到 bin/clash"
    echo "下载地址: https://github.com/Dreamacro/clash/releases"
    exit 1
fi

# 解压
echo "解压 Clash..."
gunzip -f bin/clash.gz

# 设置权限
chmod +x bin/clash

# 验证
if [ -f "bin/clash" ]; then
    echo "✅ Clash 安装成功"
    echo ""
    echo "版本信息:"
    ./bin/clash -v
    echo ""
    echo "Clash 路径: $(pwd)/bin/clash"
else
    echo "❌ 安装失败"
    exit 1
fi

echo ""
echo "================================"
echo "安装完成！"
echo "================================"
echo ""
echo "现在可以使用 Clash 核心进行真实节点测试"
echo ""
