#!/bin/bash
# 节点本地检测工具 - 安装脚本

echo "================================"
echo "节点本地检测工具 - 安装向导"
echo "================================"
echo ""

# 检查 PHP
echo "检查 PHP..."
if ! command -v php &> /dev/null; then
    echo "❌ 未找到 PHP，请先安装 PHP 8.2+"
    exit 1
fi
PHP_VERSION=$(php -v | head -n 1 | cut -d " " -f 2 | cut -d "." -f 1,2)
echo "✅ PHP 版本: $PHP_VERSION"
echo ""

# 检查 Python
echo "检查 Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python3，请先安装 Python 3.7+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d " " -f 2)
echo "✅ Python 版本: $PYTHON_VERSION"
echo ""

# 检查 Composer
echo "检查 Composer..."
if ! command -v composer &> /dev/null; then
    echo "❌ 未找到 Composer，请先安装 Composer"
    exit 1
fi
echo "✅ Composer 已安装"
echo ""

# 安装 PHP 依赖
echo "安装 PHP 依赖..."
composer install --no-dev --optimize-autoloader
if [ $? -ne 0 ]; then
    echo "❌ PHP 依赖安装失败"
    exit 1
fi
echo "✅ PHP 依赖安装完成"
echo ""

# 安装 Python 依赖
echo "安装 Python 依赖..."
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
if [ $? -ne 0 ]; then
    echo "❌ Python 依赖安装失败"
    exit 1
fi
echo "✅ Python 依赖安装完成"
echo ""

# 设置权限
echo "设置文件权限..."
chmod +x scripts/check_node.py
chmod 664 *.html
chmod 664 js/*.js 2>/dev/null
chmod 664 api/*.php 2>/dev/null
chmod 775 yamls 2>/dev/null || mkdir -p yamls && chmod 775 yamls
echo "✅ 权限设置完成"
echo ""

# 创建必要目录
echo "创建必要目录..."
mkdir -p logs
mkdir -p yamls
chmod 775 logs yamls
echo "✅ 目录创建完成"
echo ""

echo "================================"
echo "✅ 安装完成！"
echo "================================"
echo ""
echo "访问地址: https://home.liukun.com:8443/Projects/NodeLocalChecker/"
echo ""
echo "使用说明:"
echo "1. 从机场聚合器导出 Clash YAML 配置"
echo "2. 上传配置文件到本工具"
echo "3. 点击'开始检测'进行批量检测"
echo "4. 选择可用节点并导出配置"
echo ""
