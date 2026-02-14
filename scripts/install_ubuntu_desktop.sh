#!/bin/bash
###############################################################################
# Ubuntu Server 图形界面 + RDP 远程桌面安装脚本
# 功能：安装完整的Ubuntu桌面环境，配置xrdp支持Windows远程桌面连接
###############################################################################

set -e

echo "=========================================="
echo "Ubuntu 图形界面 + RDP 安装脚本"
echo "=========================================="
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 卸载VNC相关服务
echo "📦 [步骤1/6] 卸载VNC服务..."
systemctl stop vncserver@:1.service 2>/dev/null || true
systemctl disable vncserver@:1.service 2>/dev/null || true
apt-get remove --purge -y tigervnc-standalone-server tigervnc-common 2>/dev/null || true
rm -rf /home/gemini/.vnc 2>/dev/null || true
echo "✅ VNC服务已卸载"
echo ""

# 2. 更新系统
echo "📦 [步骤2/6] 更新系统包列表..."
apt-get update
echo "✅ 系统包列表已更新"
echo ""

# 3. 安装Ubuntu桌面环境（选择轻量级的XFCE）
echo "📦 [步骤3/6] 安装Ubuntu桌面环境（XFCE）..."
echo "   这将需要约10-15分钟，请耐心等待..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    xfce4 \
    xfce4-goodies \
    dbus-x11 \
    x11-xserver-utils
echo "✅ 桌面环境安装完成"
echo ""

# 4. 安装xrdp（RDP服务器）
echo "📦 [步骤4/6] 安装xrdp远程桌面服务..."
apt-get install -y xrdp
echo "✅ xrdp安装完成"
echo ""

# 5. 配置xrdp
echo "⚙️  [步骤5/6] 配置xrdp..."

# 配置xrdp使用XFCE
echo "xfce4-session" > /home/gemini/.xsession
chown gemini:gemini /home/gemini/.xsession

# 配置xrdp启动脚本
cat > /etc/xrdp/startwm.sh << 'EOF'
#!/bin/sh
# xrdp X session start script (c) 2015, 2017, 2021 mirabilos
# published under The MirOS Licence

# Rely on /etc/profile to set up the environment
unset DBUS_SESSION_BUS_ADDRESS
unset XDG_RUNTIME_DIR
. /etc/profile

if [ -r /etc/default/locale ]; then
  . /etc/default/locale
  export LANG LANGUAGE
fi

# Start XFCE4 session
startxfce4
EOF

chmod +x /etc/xrdp/startwm.sh

# 允许任何用户连接
sed -i 's/allowed_users=console/allowed_users=anybody/' /etc/X11/Xwrapper.config 2>/dev/null || \
    echo "allowed_users=anybody" > /etc/X11/Xwrapper.config

# 配置xrdp端口（默认3389）
sed -i 's/port=3389/port=3389/' /etc/xrdp/xrdp.ini

# 添加gemini用户到ssl-cert组（xrdp需要）
usermod -aG ssl-cert gemini

echo "✅ xrdp配置完成"
echo ""

# 6. 启动并启用xrdp服务
echo "🚀 [步骤6/6] 启动xrdp服务..."
systemctl enable xrdp
systemctl restart xrdp
systemctl status xrdp --no-pager

echo ""
echo "=========================================="
echo "✅ 安装完成！"
echo "=========================================="
echo ""
echo "📋 连接信息："
echo "   协议: RDP (远程桌面协议)"
echo "   端口: 3389"
echo "   用户: gemini"
echo "   密码: [你的gemini用户密码]"
echo ""
echo "🔧 Windows远程桌面连接方法："
echo "   1. 打开Windows远程桌面连接 (mstsc.exe)"
echo "   2. 输入服务器IP地址"
echo "   3. 点击连接"
echo "   4. 输入用户名: gemini"
echo "   5. 输入密码"
echo ""
echo "🔧 Mac远程桌面连接方法："
echo "   1. 从App Store安装 'Microsoft Remote Desktop'"
echo "   2. 添加PC，输入服务器IP"
echo "   3. 输入用户名和密码连接"
echo ""
echo "🔥 防火墙配置："
echo "   如果无法连接，请确保防火墙允许3389端口："
echo "   sudo ufw allow 3389/tcp"
echo ""
echo "📊 服务状态检查："
echo "   sudo systemctl status xrdp"
echo ""
echo "🔄 重启服务："
echo "   sudo systemctl restart xrdp"
echo ""
echo "=========================================="
