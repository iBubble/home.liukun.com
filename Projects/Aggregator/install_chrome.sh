#!/bin/bash
# 安装 Google Chrome 用于 Puppeteer 自动登录

echo "=========================================="
echo "  安装 Google Chrome for Linux"
echo "=========================================="
echo ""

# 检查是否已安装
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome 已安装"
    google-chrome --version
    exit 0
fi

echo "📦 开始安装 Google Chrome..."
echo ""

# 下载 Chrome
echo "1. 下载 Chrome deb 包..."
cd /tmp
wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb

if [ ! -f google-chrome-stable_current_amd64.deb ]; then
    echo "❌ 下载失败"
    exit 1
fi

echo "✅ 下载完成"
echo ""

# 安装
echo "2. 安装 Chrome..."
sudo dpkg -i google-chrome-stable_current_amd64.deb

# 修复依赖
echo ""
echo "3. 修复依赖..."
sudo apt-get install -f -y

# 验证安装
echo ""
echo "4. 验证安装..."
if command -v google-chrome &> /dev/null; then
    echo "✅ 安装成功！"
    google-chrome --version
    
    # 清理
    rm -f /tmp/google-chrome-stable_current_amd64.deb
    
    echo ""
    echo "🎉 现在可以运行 OAuth 自动登录："
    echo "   node linuxdo_auth.js"
else
    echo "❌ 安装失败"
    exit 1
fi
