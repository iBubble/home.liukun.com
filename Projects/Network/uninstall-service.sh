#!/bin/bash
# 卸载Network Monitor systemd服务

SYSTEMD_PATH="/etc/systemd/system/network-monitor.service"

echo "正在卸载Network Monitor服务..."

# 停止服务
sudo systemctl stop network-monitor.service

# 禁用服务（取消开机自启）
sudo systemctl disable network-monitor.service

# 删除服务文件
sudo rm -f "$SYSTEMD_PATH"

# 重新加载systemd配置
sudo systemctl daemon-reload

echo ""
echo "卸载完成！"
echo "守护进程已停止，开机自启已取消。"
echo "如需手动启动，请使用: bash start-monitor.sh"
