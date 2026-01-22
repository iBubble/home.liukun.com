#!/bin/bash
# 安装Network Monitor守护进程为systemd服务

SERVICE_FILE="network-monitor.service"
SYSTEMD_PATH="/etc/systemd/system/network-monitor.service"

echo "正在安装Network Monitor服务..."

# 复制服务文件到systemd目录
sudo cp "$SERVICE_FILE" "$SYSTEMD_PATH"

# 重新加载systemd配置
sudo systemctl daemon-reload

# 启用服务（开机自启）
sudo systemctl enable network-monitor.service

# 启动服务
sudo systemctl start network-monitor.service

# 检查服务状态
sudo systemctl status network-monitor.service

echo ""
echo "安装完成！"
echo "使用以下命令管理服务："
echo "  查看状态: sudo systemctl status network-monitor"
echo "  启动服务: sudo systemctl start network-monitor"
echo "  停止服务: sudo systemctl stop network-monitor"
echo "  重启服务: sudo systemctl restart network-monitor"
echo "  查看日志: sudo journalctl -u network-monitor -f"
