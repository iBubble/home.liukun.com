#!/bin/bash
# 在 Ubuntu 服务器上安装 VNC + Firefox 用于手动登录获取 Cookie

echo "=========================================="
echo "  安装 VNC + Firefox 图形环境"
echo "=========================================="
echo ""

# 1. 安装必要组件
echo "1. 安装 TigerVNC 和 Firefox..."
sudo apt-get update
sudo apt-get install -y tigervnc-standalone-server tigervnc-common firefox dbus-x11

# 2. 设置 VNC 密码
echo ""
echo "2. 设置 VNC 密码..."
echo "请输入 VNC 连接密码（6-8位）："
vncpasswd

# 3. 创建 VNC 启动配置
echo ""
echo "3. 创建 VNC 配置..."

mkdir -p ~/.vnc

cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
export XKL_XMODMAP_DISABLE=1

# 启动窗口管理器（轻量级）
which xfce4-session > /dev/null 2>&1 && exec xfce4-session &
which mate-session > /dev/null 2>&1 && exec mate-session &

# 如果没有桌面环境，直接启动 Firefox
firefox &

# 保持会话运行
while true; do
    sleep 1000
done
EOF

chmod +x ~/.vnc/xstartup

# 4. 创建启动脚本
cat > ~/start_vnc.sh << 'EOF'
#!/bin/bash
# 启动 VNC 服务器

# 停止已有的 VNC 会话
vncserver -kill :1 2>/dev/null

# 启动新的 VNC 会话（分辨率 1280x800）
vncserver :1 -geometry 1280x800 -depth 24

echo ""
echo "✅ VNC 服务器已启动！"
echo ""
echo "连接信息："
echo "  地址: $(hostname -I | awk '{print $1}'):5901"
echo "  或者: home.liukun.com:5901"
echo ""
echo "使用 VNC 客户端连接："
echo "  - macOS: 使用内置的「屏幕共享」或下载 RealVNC Viewer"
echo "  - Windows: 下载 RealVNC Viewer 或 TightVNC"
echo ""
echo "停止 VNC: vncserver -kill :1"
EOF

chmod +x ~/start_vnc.sh

# 5. 创建停止脚本
cat > ~/stop_vnc.sh << 'EOF'
#!/bin/bash
vncserver -kill :1
echo "VNC 服务器已停止"
EOF

chmod +x ~/stop_vnc.sh

echo ""
echo "=========================================="
echo "  安装完成！"
echo "=========================================="
echo ""
echo "使用方法："
echo ""
echo "1. 启动 VNC 服务器："
echo "   bash ~/start_vnc.sh"
echo ""
echo "2. 在你的 Mac 上连接："
echo "   - 打开「Finder」→「前往」→「连接服务器」"
echo "   - 输入: vnc://home.liukun.com:5901"
echo "   - 输入刚才设置的 VNC 密码"
echo ""
echo "3. 在 VNC 中打开 Firefox："
echo "   - 右键桌面 → 打开终端"
echo "   - 运行: firefox"
echo ""
echo "4. 在 Firefox 中设置代理："
echo "   - 设置 → 网络设置 → 手动代理配置"
echo "   - SOCKS Host: 127.0.0.1"
echo "   - Port: 7940"
echo "   - SOCKS v5"
echo ""
echo "5. 登录 linux.do 并获取 Cookie："
echo "   - 访问 https://linux.do"
echo "   - 登录账号"
echo "   - F12 → Console → 运行: copy(document.cookie)"
echo "   - Cookie 已复制到剪贴板"
echo ""
echo "6. 更新服务器上的 Cookie："
echo "   - 在服务器终端运行: cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator"
echo "   - 运行: node update_cookie.js"
echo "   - 粘贴 Cookie"
echo ""
echo "7. 停止 VNC 服务器："
echo "   bash ~/stop_vnc.sh"
echo ""
