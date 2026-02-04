#!/bin/bash

echo "=================================================="
echo "   机场聚合器 - 初始化脚本"
echo "=================================================="

# 项目目录
PROJECT_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
cd "$PROJECT_DIR"

echo "[*] 检查项目目录..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo "[-] 项目目录不存在: $PROJECT_DIR"
    exit 1
fi

echo "[*] 创建必要目录..."
mkdir -p data logs external

echo "[*] 设置目录权限..."
chmod 775 data logs external
chmod 664 api/index.php
chmod 664 js/app.js
chmod 664 index.html
chmod 664 .htaccess

echo "[*] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "[-] Python3 未安装，请先安装Python3"
    exit 1
fi

echo "[*] 检查Git环境..."
if ! command -v git &> /dev/null; then
    echo "[-] Git 未安装，请先安装Git"
    exit 1
fi

echo "[*] 检查核心代码..."
if [ ! -d "external/aggregator" ]; then
    echo "[*] 正在下载核心代码..."
    cd external
    git clone https://github.com/wzdnzd/aggregator.git
    cd ..
    
    if [ -d "external/aggregator" ]; then
        echo "[+] 核心代码下载成功"
    else
        echo "[-] 核心代码下载失败"
        exit 1
    fi
else
    echo "[+] 核心代码已存在"
fi

echo "[*] 安装Python依赖..."
if [ -f "external/aggregator/requirements.txt" ]; then
    pip3 install -r external/aggregator/requirements.txt --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple
    pip3 install pyyaml requests tqdm geoip2 pycryptodomex --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple
    echo "[+] Python依赖安装完成"
else
    echo "[-] requirements.txt 文件未找到"
    echo "[*] 安装基础依赖..."
    pip3 install pyyaml requests tqdm geoip2 pycryptodomex --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple
fi

echo "[*] 创建状态文件..."
cat > data/status.json << 'EOF'
{
    "server_running": false,
    "node_count": 0,
    "last_update": null,
    "core_version": "Latest"
}
EOF

echo "[*] 创建初始日志..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 机场聚合器初始化完成" > logs/aggregator.log

echo "[*] 测试API接口..."
if curl -s "https://home.liukun.com:8443/Projects/Aggregator/api/status" > /dev/null; then
    echo "[+] API接口测试成功"
else
    echo "[-] API接口测试失败，请检查Web服务器配置"
fi

echo ""
echo "=================================================="
echo "   初始化完成！"
echo "=================================================="
echo ""
echo "访问地址: https://home.liukun.com:8443/Projects/Aggregator/"
echo ""
echo "使用说明:"
echo "1. 访问Web界面"
echo "2. 点击'更新核心'按钮（如果核心代码有更新）"
echo "3. 执行'完整扫描'获取节点"
echo "4. 启动订阅服务器"
echo "5. 复制订阅链接到客户端"
echo ""
echo "故障排除:"
echo "- 查看日志: tail -f logs/aggregator.log"
echo "- 检查权限: ls -la data/ logs/ external/"
echo "- 测试API: curl https://home.liukun.com:8443/Projects/Aggregator/api/status"
echo ""