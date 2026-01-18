#!/bin/bash

# 完整网站备份脚本
# 备份所有文件、数据库、配置、证书等

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/www/wwwroot/ibubble.vicp.net/backups"
BACKUP_DIR="${BACKUP_ROOT}/full-backup-${TIMESTAMP}"

echo "=========================================="
echo "开始完整备份"
echo "时间: $(date)"
echo "备份目录: ${BACKUP_DIR}"
echo "=========================================="

# 创建备份目录
mkdir -p "${BACKUP_DIR}"/{website,databases,nginx,ssl,pm2,system}

# 1. 备份网站文件
echo ""
echo "[1/7] 备份网站文件..."
cd /www/wwwroot/ibubble.vicp.net

# 排除 node_modules 和其他大文件
tar -czf "${BACKUP_DIR}/website/site-files.tar.gz" \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='Projects/*/node_modules' \
    --exclude='Projects/*/dist' \
    . 2>/dev/null

echo "✓ 网站文件备份完成: $(du -h ${BACKUP_DIR}/website/site-files.tar.gz | cut -f1)"

# 2. 备份数据库
echo ""
echo "[2/7] 备份数据库..."

# AIMovie 数据库
mysqldump -u root -p'Gl5181081' ai_movie > "${BACKUP_DIR}/databases/ai_movie.sql" 2>/dev/null
echo "✓ ai_movie 数据库: $(du -h ${BACKUP_DIR}/databases/ai_movie.sql | cut -f1)"

# 列出所有数据库
mysql -u root -p'Gl5181081' -e "SHOW DATABASES;" 2>/dev/null | grep -Ev "Database|information_schema|performance_schema|mysql|sys" > "${BACKUP_DIR}/databases/database-list.txt"

# 备份其他数据库
while read db; do
    if [ ! -z "$db" ]; then
        mysqldump -u root -p'Gl5181081' "$db" > "${BACKUP_DIR}/databases/${db}.sql" 2>/dev/null
        echo "✓ ${db} 数据库: $(du -h ${BACKUP_DIR}/databases/${db}.sql | cut -f1)"
    fi
done < "${BACKUP_DIR}/databases/database-list.txt"

# 3. 备份 Nginx 配置
echo ""
echo "[3/7] 备份 Nginx 配置..."

# 主配置
sudo cp /www/server/nginx/conf/nginx.conf "${BACKUP_DIR}/nginx/" 2>/dev/null

# 站点配置
sudo cp -r /www/server/panel/vhost/nginx/* "${BACKUP_DIR}/nginx/" 2>/dev/null

# 重写规则
sudo cp -r /www/server/panel/vhost/rewrite/* "${BACKUP_DIR}/nginx/rewrite/" 2>/dev/null

echo "✓ Nginx 配置备份完成"

# 4. 备份 SSL 证书
echo ""
echo "[4/7] 备份 SSL 证书..."

sudo cp -r /www/server/panel/vhost/cert/* "${BACKUP_DIR}/ssl/" 2>/dev/null

echo "✓ SSL 证书备份完成"

# 5. 备份 PM2 配置
echo ""
echo "[5/7] 备份 PM2 配置和进程列表..."

# PM2 进程列表
pm2 list > "${BACKUP_DIR}/pm2/process-list.txt" 2>/dev/null
pm2 save 2>/dev/null

# PM2 配置文件
if [ -f ~/.pm2/dump.pm2 ]; then
    cp ~/.pm2/dump.pm2 "${BACKUP_DIR}/pm2/"
fi

# 复制 PM2 生态系统文件（如果存在）
find /www/wwwroot/ibubble.vicp.net -name "ecosystem.config.js" -o -name "pm2.config.js" | while read file; do
    cp "$file" "${BACKUP_DIR}/pm2/"
done

echo "✓ PM2 配置备份完成"

# 6. 备份系统配置
echo ""
echo "[6/7] 备份系统配置..."

# 环境变量文件
find /www/wwwroot/ibubble.vicp.net -name ".env*" -type f | while read file; do
    relative_path=$(echo "$file" | sed 's|/www/wwwroot/ibubble.vicp.net/||')
    mkdir -p "${BACKUP_DIR}/system/env/$(dirname $relative_path)"
    cp "$file" "${BACKUP_DIR}/system/env/$relative_path"
done

# Git 配置
cp /www/wwwroot/ibubble.vicp.net/.gitignore "${BACKUP_DIR}/system/" 2>/dev/null
git -C /www/wwwroot/ibubble.vicp.net log --oneline -10 > "${BACKUP_DIR}/system/git-log.txt" 2>/dev/null
git -C /www/wwwroot/ibubble.vicp.net remote -v > "${BACKUP_DIR}/system/git-remote.txt" 2>/dev/null

# 系统信息
uname -a > "${BACKUP_DIR}/system/system-info.txt"
df -h > "${BACKUP_DIR}/system/disk-usage.txt"
free -h > "${BACKUP_DIR}/system/memory-info.txt"
netstat -tlnp 2>/dev/null | grep LISTEN > "${BACKUP_DIR}/system/listening-ports.txt"

# PHP 版本
php -v > "${BACKUP_DIR}/system/php-version.txt" 2>/dev/null

# Node 版本
node -v > "${BACKUP_DIR}/system/node-version.txt" 2>/dev/null
npm -v > "${BACKUP_DIR}/system/npm-version.txt" 2>/dev/null

echo "✓ 系统配置备份完成"

# 7. 创建备份清单
echo ""
echo "[7/7] 创建备份清单..."

cat > "${BACKUP_DIR}/BACKUP_INFO.txt" << EOF
========================================
完整网站备份信息
========================================

备份时间: $(date)
备份目录: ${BACKUP_DIR}
主机名: $(hostname)
操作系统: $(uname -a)

========================================
备份内容
========================================

1. 网站文件
   - 路径: /www/wwwroot/ibubble.vicp.net
   - 文件: website/site-files.tar.gz
   - 大小: $(du -h ${BACKUP_DIR}/website/site-files.tar.gz | cut -f1)
   - 排除: node_modules, .git, backups, dist

2. 数据库
   - ai_movie: $(du -h ${BACKUP_DIR}/databases/ai_movie.sql | cut -f1)
   - 其他数据库: 见 databases/ 目录

3. Nginx 配置
   - 主配置: nginx.conf
   - 站点配置: nginx/*.conf
   - 重写规则: nginx/rewrite/

4. SSL 证书
   - 路径: ssl/
   - 证书: ibubble.vicp.net

5. PM2 配置
   - 进程列表: pm2/process-list.txt
   - 配置文件: pm2/dump.pm2

6. 系统配置
   - 环境变量: system/env/
   - Git 信息: system/git-*.txt
   - 系统信息: system/system-info.txt

========================================
恢复说明
========================================

1. 恢复网站文件:
   cd /www/wwwroot/ibubble.vicp.net
   tar -xzf ${BACKUP_DIR}/website/site-files.tar.gz

2. 恢复数据库:
   mysql -u root -p'Gl5181081' ai_movie < ${BACKUP_DIR}/databases/ai_movie.sql

3. 恢复 Nginx 配置:
   sudo cp ${BACKUP_DIR}/nginx/*.conf /www/server/panel/vhost/nginx/
   sudo nginx -s reload

4. 恢复 SSL 证书:
   sudo cp -r ${BACKUP_DIR}/ssl/* /www/server/panel/vhost/cert/

5. 恢复 PM2 进程:
   pm2 resurrect

========================================
备份文件列表
========================================

EOF

# 添加文件列表
find "${BACKUP_DIR}" -type f -exec ls -lh {} \; >> "${BACKUP_DIR}/BACKUP_INFO.txt"

echo "✓ 备份清单创建完成"

# 8. 压缩整个备份
echo ""
echo "[压缩] 创建压缩包..."
cd "${BACKUP_ROOT}"
tar -czf "full-backup-${TIMESTAMP}.tar.gz" "full-backup-${TIMESTAMP}" 2>/dev/null

COMPRESSED_SIZE=$(du -h "full-backup-${TIMESTAMP}.tar.gz" | cut -f1)

echo "✓ 压缩包创建完成: ${COMPRESSED_SIZE}"

# 9. 清理旧备份（保留最近 5 个）
echo ""
echo "[清理] 清理旧备份..."
cd "${BACKUP_ROOT}"
ls -t full-backup-*.tar.gz | tail -n +6 | xargs -r rm -f
ls -td full-backup-*/ | tail -n +6 | xargs -r rm -rf

echo "✓ 旧备份已清理（保留最近 5 个）"

# 10. 完成
echo ""
echo "=========================================="
echo "备份完成！"
echo "=========================================="
echo ""
echo "备份位置:"
echo "  目录: ${BACKUP_DIR}"
echo "  压缩包: ${BACKUP_ROOT}/full-backup-${TIMESTAMP}.tar.gz"
echo "  大小: ${COMPRESSED_SIZE}"
echo ""
echo "查看备份信息:"
echo "  cat ${BACKUP_DIR}/BACKUP_INFO.txt"
echo ""
echo "=========================================="
