#!/bin/bash

echo "=================================================="
echo "   启用 PHP 执行函数"
echo "=================================================="

# 查找 PHP 8.2 配置文件
PHP_INI="/www/server/php/82/etc/php.ini"

if [ ! -f "$PHP_INI" ]; then
    echo "[-] 未找到 PHP 配置文件: $PHP_INI"
    echo "[*] 尝试查找其他版本..."
    
    # 尝试其他常见路径
    for version in 81 80 74 73; do
        PHP_INI="/www/server/php/$version/etc/php.ini"
        if [ -f "$PHP_INI" ]; then
            echo "[+] 找到 PHP 配置文件: $PHP_INI"
            break
        fi
    done
    
    if [ ! -f "$PHP_INI" ]; then
        echo "[-] 无法找到 PHP 配置文件"
        exit 1
    fi
fi

echo "[*] PHP 配置文件: $PHP_INI"

# 备份原配置文件
BACKUP_FILE="${PHP_INI}.backup.$(date +%Y%m%d_%H%M%S)"
echo "[*] 备份配置文件到: $BACKUP_FILE"
sudo cp "$PHP_INI" "$BACKUP_FILE"

# 查看当前禁用的函数
echo ""
echo "[*] 当前禁用的函数:"
grep "^disable_functions" "$PHP_INI"

# 需要启用的函数
FUNCTIONS_TO_ENABLE="exec,shell_exec,proc_open,popen,system,passthru"

echo ""
echo "[*] 准备启用以下函数: $FUNCTIONS_TO_ENABLE"
echo ""
read -p "是否继续? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "[*] 操作已取消"
    exit 0
fi

# 读取当前禁用函数列表
CURRENT_DISABLED=$(grep "^disable_functions" "$PHP_INI" | sed 's/disable_functions = //')

# 移除需要启用的函数
NEW_DISABLED="$CURRENT_DISABLED"
for func in $(echo $FUNCTIONS_TO_ENABLE | tr ',' ' '); do
    NEW_DISABLED=$(echo "$NEW_DISABLED" | sed "s/$func,//g" | sed "s/,$func//g" | sed "s/$func//g")
done

# 清理多余的逗号
NEW_DISABLED=$(echo "$NEW_DISABLED" | sed 's/,,/,/g' | sed 's/^,//' | sed 's/,$//')

echo "[*] 更新配置..."
sudo sed -i "s/^disable_functions = .*/disable_functions = $NEW_DISABLED/" "$PHP_INI"

echo ""
echo "[*] 新的禁用函数列表:"
grep "^disable_functions" "$PHP_INI"

# 重启 PHP-FPM
echo ""
echo "[*] 重启 PHP-FPM..."

# 查找 PHP-FPM 进程
PHP_VERSION=$(echo "$PHP_INI" | grep -oP '\d+' | head -1)
PHP_FPM_SERVICE="php-fpm-${PHP_VERSION}"

if systemctl list-units --type=service | grep -q "$PHP_FPM_SERVICE"; then
    sudo systemctl restart "$PHP_FPM_SERVICE"
    echo "[+] PHP-FPM 已重启"
else
    # 尝试宝塔的重启方式
    if [ -f "/etc/init.d/php-fpm-${PHP_VERSION}" ]; then
        sudo /etc/init.d/php-fpm-${PHP_VERSION} restart
        echo "[+] PHP-FPM 已重启"
    else
        echo "[!] 请手动重启 PHP-FPM"
        echo "    方法1: 在宝塔面板中重启 PHP"
        echo "    方法2: sudo systemctl restart php-fpm"
    fi
fi

echo ""
echo "=================================================="
echo "   配置完成！"
echo "=================================================="
echo ""
echo "测试命令:"
echo "  php -r \"echo exec('whoami');\""
echo ""
echo "如需恢复原配置:"
echo "  sudo cp $BACKUP_FILE $PHP_INI"
echo "  sudo systemctl restart php-fpm-${PHP_VERSION}"
echo ""
