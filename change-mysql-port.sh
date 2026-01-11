#!/bin/bash
echo "此脚本将MySQL端口从3306改为13306"
echo "是否继续? (输入 yes 继续)"
read -r answer
if [ "$answer" != "yes" ]; then
    echo "已取消"
    exit 0
fi

# 备份配置
sudo cp /etc/my.cnf /etc/my.cnf.bak

# 添加端口配置
sudo bash -c 'cat >> /etc/my.cnf << "MYCNF"
[mysqld]
port=13306
MYCNF'

# 添加防火墙规则
sudo iptables -I INPUT -p tcp --dport 13306 -j ACCEPT

# 重启MySQL
sudo systemctl restart mysql

echo "✓ MySQL端口已改为13306"
echo "✓ 请在路由器上添加13306端口转发"
echo "✓ Navicat连接端口改为13306"
