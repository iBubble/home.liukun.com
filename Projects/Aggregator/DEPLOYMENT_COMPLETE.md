# 机场聚合器(国内版) - 部署完成报告

**部署日期**: 2026-02-08
**部署服务器**: home.liukun.com (Ubuntu 24.04.3 LTS)
**项目路径**: `/www/wwwroot/ibubble.vicp.net/Projects/Aggregator`

---

## ✅ 部署完成状态

### 1. 项目迁移
- ✅ 从备份文件 `migration_backup_20260208_051500_full.tar.gz` 解压完成
- ✅ 项目文件已部署到 `/www/wwwroot/ibubble.vicp.net/Projects/Aggregator`
- ✅ 所有依赖已安装 (npm install 完成)
- ✅ 文件权限已设置 (775/664)

### 2. 配置修改
- ✅ `ecosystem.config.js` - 路径已更新为当前服务器路径
- ✅ `app.js` - Clash二进制路径已配置为 `/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/bin/clash`
- ✅ `app.js` - 根路径处理已修复
- ✅ `index.html` 和 `Aggregator.yaml` 已复制到项目根目录

### 3. PM2 服务
- ✅ PM2 服务已启动 (进程名: aggregator)
- ✅ 服务状态: online
- ✅ 监听端口: 3000
- ✅ 开机自启已配置 (systemd)
- ✅ 进程管理: `pm2 list` 可查看状态

### 4. Nginx 反向代理
- ✅ Nginx配置已存在 (`/www/server/panel/vhost/nginx/ibubble.vicp.net.conf`)
- ✅ 反向代理配置: `/Projects/Aggregator/` → `http://127.0.0.1:3000/`
- ✅ HTTPS 支持: 8443端口
- ✅ 跨域配置已设置

### 5. Projects页面更新
- ✅ `projects.html` 已添加"机场聚合器(国内版)"项目卡片
- ✅ 项目描述和链接已配置

### 6. API路径修复 (2026-02-08)
- ✅ 修复"全网获取节点"按钮API调用错误
- ✅ 添加API基础路径配置 (`apiUrl` 辅助函数)
- ✅ 批量更新所有API调用路径
- ✅ 页面标题已修改为"机场聚合器国内版"
- ✅ 详细修复报告: `API_FIX_REPORT.md`

---

## 🌐 访问地址

**主访问地址**: https://home.liukun.com:8443/Projects/Aggregator/

**备用地址**:
- https://ibubble.vicp.net:8443/Projects/Aggregator/
- https://192.168.1.40:8443/Projects/Aggregator/

---

## 📋 服务管理命令

### PM2 进程管理
```bash
# 查看服务状态
pm2 list

# 查看日志
pm2 logs aggregator

# 重启服务
pm2 restart aggregator

# 停止服务
pm2 stop aggregator

# 启动服务
pm2 start ecosystem.config.js

# 保存进程列表
pm2 save
```

### 日志查看
```bash
# 应用日志
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/out.log
tail -f /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/error.log

# PM2 日志
pm2 logs aggregator --lines 100
```

### Nginx 管理
```bash
# 测试配置
sudo nginx -t

# 重载配置
sudo nginx -s reload

# 重启Nginx
sudo systemctl restart nginx
```

---

## 🔧 项目配置

### 端口配置
- **应用端口**: 3000 (内部)
- **Clash HTTP代理**: 7890
- **Clash控制器**: 9090

### Clash 配置
- **二进制路径**: `/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/bin/clash`
- **配置目录**: `clash_bin/`
- **数据目录**: `clash_data/`

### 关键文件
- `app.js` - 主应用程序
- `index.html` - Web界面
- `ecosystem.config.js` - PM2配置
- `Aggregator.yaml` - 导出的Clash配置
- `proxies.json` - 节点数据
- `purity_db.json` - IP纯净度数据库

---

## 📊 功能特性

### 已实现功能
1. ✅ 节点抓取
   - LinuxDo论坛节点
   - 临时邮箱节点
   - 手动添加节点

2. ✅ 节点检测
   - TCP连通性测试
   - 延迟测试
   - IP纯净度检测

3. ✅ 节点管理
   - 去重功能
   - 筛选功能
   - 排序功能

4. ✅ 导出功能
   - Clash配置导出
   - 订阅链接生成

5. ✅ 定时任务
   - 自动更新节点
   - Cron定时执行

---

## ⚠️ 注意事项

### 1. Clash核心依赖
- 项目依赖NodeLocalChecker的Clash二进制文件
- 如果NodeLocalChecker项目被删除或移动,需要更新Clash路径

### 2. 端口占用
- 确保3000端口未被其他应用占用
- Clash代理端口7890和9090也需要保持可用

### 3. 权限要求
- 项目目录需要gemini:www权限
- Clash二进制需要执行权限

### 4. 内存使用
- PM2配置了500M内存限制
- 超过限制会自动重启

---

## 🔄 更新和维护

### 更新代码
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
git pull
npm install --registry=https://registry.npmmirror.com
pm2 restart aggregator
```

### 备份数据
```bash
# 备份节点数据
cp proxies.json proxies.json.backup
cp purity_db.json purity_db.json.backup

# 备份配置
cp Aggregator.yaml Aggregator.yaml.backup
```

### 清理日志
```bash
# 清理PM2日志
pm2 flush aggregator

# 清理应用日志
> logs/out.log
> logs/error.log
```

---

## 📞 故障排查

### 服务无法启动
1. 检查端口占用: `netstat -tlnp | grep 3000`
2. 查看错误日志: `pm2 logs aggregator --err`
3. 检查Clash路径: `ls -la /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/bin/clash`

### 无法访问网页
1. 检查PM2状态: `pm2 list`
2. 检查Nginx配置: `sudo nginx -t`
3. 测试本地访问: `curl http://127.0.0.1:3000/`

### Clash启动失败
1. 检查Clash二进制权限: `chmod +x /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/bin/clash`
2. 检查配置文件: `cat clash_bin/config.yaml`
3. 手动测试Clash: `/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/bin/clash -d clash_bin`

---

## 📝 待办事项

- [ ] 配置定时任务 (Cron)
- [ ] 测试LinuxDo节点抓取功能
- [ ] 测试临时邮箱节点抓取功能
- [ ] 验证IP纯净度检测功能
- [ ] 配置监控告警

---

## 🎉 部署成功

项目已成功部署并运行！

**访问地址**: https://home.liukun.com:8443/Projects/Aggregator/

如有问题,请查看日志或联系管理员。
