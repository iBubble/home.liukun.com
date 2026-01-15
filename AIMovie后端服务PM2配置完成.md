# AIMovie 后端服务 PM2 配置完成

## 配置时间
2026-01-15

## 配置内容

### 1. PM2 进程管理
已将 AIMovie 后端服务配置为 PM2 管理的常驻进程，无需手动启动。

### 2. 服务信息
- **进程名称**: `aimovie-api`
- **进程 ID**: 1
- **运行目录**: `/www/wwwroot/ibubble.vicp.net/Projects/AIMovie`
- **启动文件**: `server/index.cjs`
- **运行端口**: 3001
- **运行状态**: ✅ online
- **内存占用**: ~73MB

### 3. 开机自启动
已配置 systemd 服务，服务器重启后自动启动：
- **服务名称**: `pm2-gemini.service`
- **服务类型**: systemd
- **用户**: gemini
- **状态**: 已启用

## PM2 常用命令

### 查看服务状态
```bash
pm2 list
```

### 查看日志
```bash
# 实时查看日志
pm2 logs aimovie-api

# 查看最近 50 行日志
pm2 logs aimovie-api --lines 50

# 只查看错误日志
pm2 logs aimovie-api --err

# 清空日志
pm2 flush aimovie-api
```

### 重启服务
```bash
# 重启 AIMovie 服务
pm2 restart aimovie-api

# 重启所有服务
pm2 restart all
```

### 停止服务
```bash
# 停止 AIMovie 服务
pm2 stop aimovie-api

# 停止所有服务
pm2 stop all
```

### 启动服务
```bash
# 启动 AIMovie 服务
pm2 start aimovie-api

# 启动所有服务
pm2 start all
```

### 删除服务
```bash
# 从 PM2 列表中删除服务（需要重新添加）
pm2 delete aimovie-api
```

### 查看详细信息
```bash
# 查看服务详细信息
pm2 show aimovie-api

# 查看实时监控
pm2 monit
```

### 保存进程列表
```bash
# 保存当前进程列表（用于开机自启动）
pm2 save
```

## 服务验证

### 1. 检查服务状态
```bash
pm2 list
```
应该看到 `aimovie-api` 状态为 `online`

### 2. 检查日志
```bash
pm2 logs aimovie-api --lines 20 --nostream
```
应该看到：
- ✅ 数据库连接成功
- 🚀 后端API服务器已启动
- 📍 地址: http://localhost:3001

### 3. 测试 API
```bash
curl http://localhost:3001/api/health
```
应该返回健康检查信息

### 4. 访问前端
访问 http://home.liukun.com/Projects/AIMovie/ 验证功能正常

## 优势

### 1. 自动重启
- 进程崩溃时自动重启
- 代码更新后可以平滑重启
- 服务器重启后自动启动

### 2. 日志管理
- 自动记录标准输出和错误日志
- 日志文件位置：`/home/gemini/.pm2/logs/`
- 支持日志轮转，防止日志文件过大

### 3. 进程监控
- 实时查看 CPU 和内存占用
- 查看进程重启次数
- 查看运行时长

### 4. 零停机部署
- 支持 `pm2 reload` 实现零停机重启
- 适合生产环境部署

## 日志文件位置

### 标准输出日志
```
/home/gemini/.pm2/logs/aimovie-api-out.log
```

### 错误日志
```
/home/gemini/.pm2/logs/aimovie-api-error.log
```

### PM2 进程文件
```
/home/gemini/.pm2/dump.pm2
```

## 环境变量加载

服务启动时自动加载环境变量：
- 文件：`Projects/AIMovie/.env.production`
- 包含：数据库配置、API Keys 等
- 日志显示：`[dotenv@17.2.3] injecting env (16) from .env.production`

## 故障排查

### 服务无法启动
1. 查看错误日志：`pm2 logs aimovie-api --err`
2. 检查端口占用：`lsof -i :3001`
3. 检查环境变量：确保 `.env.production` 文件存在
4. 检查数据库连接：确保 MySQL 服务运行正常

### 服务频繁重启
1. 查看重启次数：`pm2 list`（查看 ↺ 列）
2. 查看错误日志：`pm2 logs aimovie-api --err --lines 100`
3. 检查内存占用：`pm2 monit`
4. 检查代码错误：确保没有未捕获的异常

### 开机未自动启动
1. 检查 systemd 服务：`systemctl status pm2-gemini`
2. 重新配置自启动：`pm2 startup` 然后执行提示的命令
3. 保存进程列表：`pm2 save`

## 与 Nginx 集成

Nginx 配置已经将 `/Projects/AIMovie/api/*` 代理到 `http://localhost:3001`：

```nginx
location /Projects/AIMovie/api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 相关文件
- 启动脚本：`Projects/AIMovie/server/index.cjs`
- 环境配置：`Projects/AIMovie/.env.production`
- PM2 配置：`/home/gemini/.pm2/dump.pm2`
- Systemd 服务：`/etc/systemd/system/pm2-gemini.service`

## 注意事项

1. **代码更新后重启**：修改后端代码后需要执行 `pm2 restart aimovie-api`
2. **环境变量更新**：修改 `.env.production` 后需要重启服务
3. **数据库迁移**：执行数据库迁移后可能需要重启服务
4. **日志清理**：定期清理日志文件，防止占用过多磁盘空间
5. **监控告警**：建议配置监控告警，及时发现服务异常

## 下一步优化建议

1. **配置 PM2 生态系统文件**：创建 `ecosystem.config.js` 统一管理配置
2. **配置日志轮转**：使用 PM2 的日志轮转功能，自动归档旧日志
3. **配置监控告警**：集成 PM2 Plus 或其他监控服务
4. **配置负载均衡**：如果需要，可以启动多个实例实现负载均衡
5. **配置自动部署**：结合 Git hooks 实现自动部署和重启

## 总结

✅ AIMovie 后端服务已配置为 PM2 管理的常驻进程
✅ 服务器重启后自动启动
✅ 进程崩溃时自动重启
✅ 日志自动记录和管理
✅ 支持实时监控和管理

现在无需手动启动后端服务，系统会自动管理！
