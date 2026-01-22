#!/bin/bash

# SSL证书备份脚本
# 用途: 备份当前SSL证书到backups目录

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/ssl-backup-$TIMESTAMP"
CERT_DIR_HOME="/www/server/panel/vhost/cert/home.liukun.com"
CERT_DIR_IBUBBLE="/www/server/panel/vhost/cert/ibubble.vicp.net"

echo "=========================================="
echo "SSL证书备份脚本"
echo "=========================================="
echo ""

# 检查证书是否存在
if [ ! -f "$CERT_DIR_IBUBBLE/fullchain.pem" ]; then
    echo "✗ 错误: 未找到证书文件"
    exit 1
fi

# 显示当前证书信息
echo "当前证书信息:"
sudo openssl x509 -in "$CERT_DIR_IBUBBLE/fullchain.pem" -noout -dates -subject
echo ""

# 创建备份目录
echo "创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 备份证书文件
echo "备份证书文件..."
sudo cp -r "$CERT_DIR_HOME" "$BACKUP_DIR/"
sudo cp -r "$CERT_DIR_IBUBBLE" "$BACKUP_DIR/"

# 设置权限
sudo chown -R gemini:www "$BACKUP_DIR"

# 导出证书详细信息
echo "导出证书详细信息..."
sudo openssl x509 -in "$CERT_DIR_IBUBBLE/fullchain.pem" -noout -text > "$BACKUP_DIR/cert-info.txt"

# 创建恢复脚本
echo "创建恢复脚本..."
cat > "$BACKUP_DIR/restore-ssl.sh" << 'RESTORE_SCRIPT'
#!/bin/bash

# SSL证书恢复脚本
# 备份时间: BACKUP_TIME
# 证书有效期: CERT_VALIDITY

BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR_HOME="/www/server/panel/vhost/cert/home.liukun.com"
CERT_DIR_IBUBBLE="/www/server/panel/vhost/cert/ibubble.vicp.net"

echo "=========================================="
echo "SSL证书恢复脚本"
echo "=========================================="
echo ""
echo "备份目录: $BACKUP_DIR"
echo ""

# 检查备份文件是否存在
if [ ! -d "$BACKUP_DIR/home.liukun.com" ] || [ ! -d "$BACKUP_DIR/ibubble.vicp.net" ]; then
    echo "✗ 错误: 备份文件不完整"
    exit 1
fi

echo "找到备份文件:"
echo "  - home.liukun.com/"
echo "  - ibubble.vicp.net/"
echo ""

# 显示当前证书信息
echo "当前证书信息:"
if [ -f "$CERT_DIR_IBUBBLE/fullchain.pem" ]; then
    sudo openssl x509 -in "$CERT_DIR_IBUBBLE/fullchain.pem" -noout -dates -subject
else
    echo "  未找到当前证书"
fi
echo ""

# 显示备份证书信息
echo "备份证书信息:"
if [ -f "$BACKUP_DIR/ibubble.vicp.net/fullchain.pem" ]; then
    sudo openssl x509 -in "$BACKUP_DIR/ibubble.vicp.net/fullchain.pem" -noout -dates -subject
else
    echo "  未找到备份证书"
fi
echo ""

# 确认恢复
read -p "确认要恢复此备份的证书吗? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "取消恢复"
    exit 0
fi

echo ""
echo "开始恢复证书..."

# 创建目标目录
sudo mkdir -p "$CERT_DIR_HOME"
sudo mkdir -p "$CERT_DIR_IBUBBLE"

# 恢复证书文件
echo "  恢复 home.liukun.com 证书..."
sudo cp "$BACKUP_DIR/home.liukun.com/privkey.pem" "$CERT_DIR_HOME/"
sudo cp "$BACKUP_DIR/home.liukun.com/fullchain.pem" "$CERT_DIR_HOME/"

echo "  恢复 ibubble.vicp.net 证书..."
sudo cp "$BACKUP_DIR/ibubble.vicp.net/privkey.pem" "$CERT_DIR_IBUBBLE/"
sudo cp "$BACKUP_DIR/ibubble.vicp.net/fullchain.pem" "$CERT_DIR_IBUBBLE/"

# 设置权限
echo "  设置权限..."
sudo chown -R www:www "$CERT_DIR_HOME"
sudo chown -R www:www "$CERT_DIR_IBUBBLE"
sudo chmod 644 "$CERT_DIR_HOME"/*
sudo chmod 644 "$CERT_DIR_IBUBBLE"/*

# 重载Nginx
echo "  重载Nginx..."
sudo /www/server/nginx/sbin/nginx -s reload

echo ""
echo "✓ 证书恢复完成!"
echo ""
echo "恢复后的证书信息:"
sudo openssl x509 -in "$CERT_DIR_IBUBBLE/fullchain.pem" -noout -dates -subject
echo ""
echo "请访问 https://home.liukun.com:8443/ 验证证书"
RESTORE_SCRIPT

# 替换占位符
BACKUP_TIME=$(date '+%Y-%m-%d %H:%M:%S')
CERT_VALIDITY=$(sudo openssl x509 -in "$CERT_DIR_IBUBBLE/fullchain.pem" -noout -dates | grep -oP '(?<=notBefore=|notAfter=)[^=]+' | tr '\n' ' ' | sed 's/  / 至 /')

sed -i "s/BACKUP_TIME/$BACKUP_TIME/" "$BACKUP_DIR/restore-ssl.sh"
sed -i "s/CERT_VALIDITY/$CERT_VALIDITY/" "$BACKUP_DIR/restore-ssl.sh"

chmod +x "$BACKUP_DIR/restore-ssl.sh"

# 创建README
echo "创建说明文档..."
cat > "$BACKUP_DIR/README.md" << README_CONTENT
# SSL证书备份 - $(date '+%Y-%m-%d')

## 备份信息

- **备份时间**: $BACKUP_TIME
- **证书域名**: home.liukun.com
- **证书类型**: Let's Encrypt ECC-256
- **证书有效期**: $CERT_VALIDITY
- **备份目录**: $BACKUP_DIR

## 备份内容

\`\`\`
ssl-backup-$TIMESTAMP/
├── home.liukun.com/          # home.liukun.com 证书备份
│   ├── privkey.pem           # 私钥
│   └── fullchain.pem         # 完整证书链
├── ibubble.vicp.net/         # ibubble.vicp.net 证书备份（Nginx实际使用）
│   ├── privkey.pem           # 私钥
│   └── fullchain.pem         # 完整证书链
├── cert-info.txt             # 证书详细信息
├── restore-ssl.sh            # 证书恢复脚本
└── README.md                 # 本说明文档
\`\`\`

## 如何恢复证书

### 使用恢复脚本（推荐）

\`\`\`bash
cd $BACKUP_DIR
./restore-ssl.sh
\`\`\`

### 手动恢复

\`\`\`bash
# 1. 复制证书文件
sudo cp $BACKUP_DIR/home.liukun.com/* /www/server/panel/vhost/cert/home.liukun.com/
sudo cp $BACKUP_DIR/ibubble.vicp.net/* /www/server/panel/vhost/cert/ibubble.vicp.net/

# 2. 设置权限
sudo chown -R www:www /www/server/panel/vhost/cert/home.liukun.com
sudo chown -R www:www /www/server/panel/vhost/cert/ibubble.vicp.net
sudo chmod 644 /www/server/panel/vhost/cert/home.liukun.com/*
sudo chmod 644 /www/server/panel/vhost/cert/ibubble.vicp.net/*

# 3. 重载Nginx
sudo /www/server/nginx/sbin/nginx -s reload
\`\`\`

## 验证证书

\`\`\`bash
# 查看证书信息
sudo openssl x509 -in /www/server/panel/vhost/cert/ibubble.vicp.net/fullchain.pem -noout -dates -subject

# 测试HTTPS连接
echo | openssl s_client -connect home.liukun.com:8443 -servername home.liukun.com 2>/dev/null | openssl x509 -noout -dates

# 浏览器访问
# https://home.liukun.com:8443/
\`\`\`

## 相关文件

- 证书申请脚本: \`/www/wwwroot/ibubble.vicp.net/apply-letsencrypt.sh\`
- 证书备份脚本: \`/www/wwwroot/ibubble.vicp.net/backup-ssl-cert.sh\`
- acme.sh 配置: \`/home/gemini/.acme.sh/home.liukun.com_ecc/\`
- Nginx配置: \`/www/server/panel/vhost/nginx/ibubble.vicp.net.conf\`
README_CONTENT

echo ""
echo "✓ 备份完成!"
echo ""
echo "备份位置: $BACKUP_DIR"
echo ""
echo "备份内容:"
ls -lh "$BACKUP_DIR"
echo ""
echo "使用以下命令恢复证书:"
echo "  cd $BACKUP_DIR && ./restore-ssl.sh"
