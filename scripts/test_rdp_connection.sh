#!/bin/bash
###############################################################################
# RDP连接测试脚本
###############################################################################

echo "=========================================="
echo "RDP 远程桌面连接测试"
echo "=========================================="
echo ""

# 1. 检查xrdp服务
echo "📊 [1/5] 检查xrdp服务状态..."
if systemctl is-active --quiet xrdp; then
    echo "✅ xrdp服务运行中"
else
    echo "❌ xrdp服务未运行"
    echo "   尝试启动: sudo systemctl start xrdp"
    exit 1
fi
echo ""

# 2. 检查端口监听
echo "📊 [2/5] 检查3389端口..."
if netstat -tln | grep -q ":3389"; then
    echo "✅ 3389端口正在监听"
    netstat -tln | grep ":3389"
else
    echo "❌ 3389端口未监听"
    exit 1
fi
echo ""

# 3. 检查防火墙
echo "📊 [3/5] 检查防火墙规则..."
if sudo ufw status | grep -q "3389.*ALLOW"; then
    echo "✅ 防火墙已允许3389端口"
else
    echo "⚠️  防火墙未配置3389端口"
    echo "   执行: sudo ufw allow 3389/tcp"
fi
echo ""

# 4. 检查桌面环境
echo "📊 [4/5] 检查桌面环境..."
if which xfce4-session > /dev/null 2>&1; then
    echo "✅ XFCE4桌面环境已安装"
else
    echo "❌ 桌面环境未安装"
    exit 1
fi
echo ""

# 5. 检查用户配置
echo "📊 [5/5] 检查用户会话配置..."
if [ -f /home/gemini/.xsession ]; then
    echo "✅ 用户会话配置存在"
    echo "   内容: $(cat /home/gemini/.xsession)"
else
    echo "⚠️  用户会话配置不存在"
    echo "   创建: echo 'xfce4-session' > ~/.xsession"
fi
echo ""

# 获取IP地址
echo "=========================================="
echo "📋 连接信息"
echo "=========================================="
echo ""
echo "本机IP地址:"
ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1'
echo ""
echo "连接方式:"
echo "  1. Windows: 打开'远程桌面连接' (mstsc)"
echo "  2. 输入IP地址"
echo "  3. 用户名: gemini"
echo "  4. 输入密码连接"
echo ""
echo "=========================================="
echo "✅ RDP服务配置正常，可以连接！"
echo "=========================================="
