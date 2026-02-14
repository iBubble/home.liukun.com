# 机场聚合器修复总结

## 修复日期
2026-02-08

## 问题描述
1. 页面标题显示旧版本"Antigravity 机场聚合器 Web 版"
2. 点击"全网获取节点"按钮时所有API请求返回404错误
3. Python采集器启动失败（python3.11 ENOENT）
4. 进程退出时报错（autoUpdateTimer未定义）
5. 配置文件生成到错误的嵌套路径

## 根本原因

### 1. 错误的嵌套目录结构
- 存在错误的嵌套目录：`Projects/Aggregator/Projects/Aggregator/`
- 该目录包含旧版本的index.html文件
- 导致后端读取到旧的HTML内容

### 2. Python版本不匹配
- 代码中硬编码使用 `python3.11`
- 服务器只安装了 `python3` 和 `python3.12`

### 3. 遗留代码问题
- 使用了未定义的 `autoUpdateTimer` 变量
- 应该使用 `cronTask` 来管理定时任务

### 4. 路径配置错误
- Aggregator.yaml生成路径包含错误的嵌套路径
- 应该直接生成到项目根目录

## 修复措施

### 1. 删除错误的嵌套目录
```bash
rm -rf Projects/Aggregator/Projects
```

### 2. 修复Python版本调用
**文件**: `Projects/Aggregator/app.js` (第788行)
```javascript
// 修改前
const child = spawn('python3.11', args, {

// 修改后
const child = spawn('python3', args, {
```

### 3. 修复进程退出处理
**文件**: `Projects/Aggregator/app.js` (第3092-3102行)
```javascript
// 修改前
if (autoUpdateTimer) clearInterval(autoUpdateTimer);

// 修改后
if (cronTask) cronTask.stop();
```

### 4. 修复配置文件生成路径
**文件**: `Projects/Aggregator/app.js` (第3064行)
```javascript
// 修改前
const outputPath = path.join(ROOT, 'Projects', 'Aggregator', 'Aggregator.yaml');

// 修改后
const outputPath = path.join(ROOT, 'Aggregator.yaml');
```

### 5. 重启服务
```bash
pm2 restart aggregator
```

## 验证结果

### 1. 页面标题正确
```bash
curl -s https://home.liukun.com:8443/Projects/Aggregator/ | grep title
# 输出: <title>机场聚合器国内版</title>
```

### 2. Base标签正确
```bash
curl -s https://home.liukun.com:8443/Projects/Aggregator/ | grep "base href"
# 输出: <base href="/Projects/Aggregator/">
```

### 3. API正常工作
```bash
curl -s https://home.liukun.com:8443/Projects/Aggregator/api/status
# 返回正常的JSON响应
```

### 4. Python采集器正常
- 日志中不再出现 "spawn python3.11 ENOENT" 错误
- Python脚本可以正常执行

### 5. 配置文件路径正确
- 生成路径：`/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/Aggregator.yaml`
- 不再生成到嵌套的错误路径

### 6. 无进程退出错误
- 清空错误日志后，不再出现 autoUpdateTimer 相关错误

## 技术要点

### 1. Nginx配置
- `proxy_pass http://127.0.0.1:3000;` (末尾不能有斜杠)
- 正确转发所有请求到后端Node.js服务

### 2. 前端路径处理
- 使用 `<base href="/Projects/Aggregator/">` 统一处理相对路径
- 所有API调用使用相对路径 `api/xxx`

### 3. 后端路径处理
- `ROOT = __dirname` 指向 `Projects/Aggregator/`
- 所有文件路径基于ROOT构建，避免嵌套

## 后续建议

1. **定期检查目录结构**：确保不会再次出现嵌套目录
2. **使用环境变量**：Python版本等配置应该使用环境变量而非硬编码
3. **完善错误处理**：添加更多的路径验证和错误提示
4. **代码审查**：清理所有遗留的未使用变量和代码

## 相关文件
- `Projects/Aggregator/index.html` - 前端页面（已修复标题和base标签）
- `Projects/Aggregator/app.js` - 后端服务（已修复Python调用、进程退出、路径生成）
- `/www/server/panel/vhost/nginx/ibubble.vicp.net.conf` - Nginx配置（已修复proxy_pass）

## 测试URL
- 主页：https://home.liukun.com:8443/Projects/Aggregator/
- API状态：https://home.liukun.com:8443/Projects/Aggregator/api/status
- 配置文件：https://home.liukun.com:8443/Projects/Aggregator/Aggregator.yaml
