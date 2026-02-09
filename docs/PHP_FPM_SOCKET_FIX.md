# PHP-FPM Socket 连接问题修复记录

## 问题描述

服务器重启后，NodeLocalChecker 页面出现以下问题：
- 页面顶部一直显示"正在检查 Clash 状态"
- 节点列表显示"暂无数据"
- 所有 PHP API 请求返回 502 Bad Gateway 错误

## 根本原因

**Unix Socket 权限问题**：
- PHP-FPM 配置使用 Unix socket (`/tmp/php-cgi-82.sock`)
- Socket 文件的 `listen.owner` 和 `listen.group` 被注释，导致 socket 文件所有者为 `root:root`
- Nginx worker 进程以 `www` 用户运行，无法访问 root 拥有的 socket 文件
- 导致 Nginx 无法连接到 PHP-FPM，所有 PHP 请求返回 502 错误

## 解决方案

### 方案1: 修复 Socket 权限 (尝试但失败)

修改 `/www/server/php/82/etc/php-fpm.d/www.conf`:
```conf
listen.owner = www
listen.group = www
listen.mode = 0660
```

**问题**: 即使修复权限，Nginx 仍然无法连接到 socket 文件（可能是宝塔面板的特殊配置导致）

### 方案2: 改用 TCP 端口 (最终方案) ✅

将 PHP-FPM 从 Unix socket 改为 TCP 端口通信：

1. **修改 PHP-FPM 配置** (`/www/server/php/82/etc/php-fpm.d/www.conf`):
   ```bash
   sudo sed -i 's|listen = /tmp/php-cgi-82.sock|listen = 127.0.0.1:9000|' /www/server/php/82/etc/php-fpm.d/www.conf
   ```

2. **修改 Nginx PHP 配置** (`/www/server/nginx/conf/enable-php-82.conf`):
   ```bash
   sudo sed -i 's|fastcgi_pass  unix:/tmp/php-cgi-82.sock;|fastcgi_pass  127.0.0.1:9000;|' /www/server/nginx/conf/enable-php-82.conf
   ```

3. **重启服务**:
   ```bash
   sudo /etc/init.d/php-fpm-82 restart
   sudo systemctl reload nginx
   ```

## 验证结果

修复后测试成功：
```bash
# 测试 Clash 状态 API
curl -s https://home.liukun.com:8443/Projects/NodeLocalChecker/api/check_clash.php
# 返回: {"available":true,"path":"..."}

# 测试节点列表 API
curl -s "https://home.liukun.com:8443/Projects/NodeLocalChecker/api/nodes.php?action=list"
# 返回: {"success":true,"nodes":[...],"total":422}
```

## 技术细节

### Unix Socket vs TCP 端口

**Unix Socket 优势**:
- 性能略高（无需网络协议栈）
- 更安全（文件系统权限控制）

**TCP 端口优势**:
- 权限管理简单（只需监听本地回环地址）
- 兼容性更好（不受文件系统权限影响）
- 更容易调试

### 为什么选择 TCP 端口

1. **宝塔面板环境复杂**: 宝塔可能有特殊的权限管理机制
2. **重启后稳定性**: TCP 端口不受文件系统权限变化影响
3. **性能差异可忽略**: 本地回环通信性能损失极小
4. **维护简单**: 不需要担心 socket 文件权限问题

## 配置文件位置

- PHP-FPM 主配置: `/www/server/php/82/etc/php-fpm.conf`
- PHP-FPM Pool 配置: `/www/server/php/82/etc/php-fpm.d/www.conf`
- Nginx PHP 配置: `/www/server/nginx/conf/enable-php-82.conf`
- Nginx 站点配置: `/www/server/panel/vhost/nginx/ibubble.vicp.net.conf`

## 相关服务

- PHP-FPM 服务: `php-fpm-82`
- Nginx 服务: `nginx`
- 重启命令:
  ```bash
  sudo /etc/init.d/php-fpm-82 restart
  sudo systemctl reload nginx
  ```

## 预防措施

1. **自动启动已配置**: PM2 和系统服务都已设置为开机自动启动
2. **监控建议**: 可以添加健康检查脚本定期测试 PHP-FPM 连接
3. **备份配置**: 重要配置文件应定期备份

## 修复时间

- 问题发现: 2026-02-09
- 修复完成: 2026-02-09
- 修复耗时: 约 30 分钟

## 相关文档

- [服务自动启动配置](SERVICE_AUTO_START.md)
- [NodeLocalChecker 项目文档](../Projects/NodeLocalChecker/README.md)
