# 全网节点获取系统

## 功能说明

实现了完整的节点获取工作流程：
1. 下载付费订阅节点
2. 启动Clash代理
3. 通过代理获取各种来源节点（包括Linux.do）
4. 停止代理
5. 合并去重并保存

## 使用方法

### 命令行使用

```bash
# 直接运行
node fetch_all_nodes.js

# 或使用测试脚本
bash test_fetch_all.sh
```

### 在代码中使用

```javascript
const { main } = require('./fetch_all_nodes');

// 获取所有节点
const nodes = await main();
console.log(`获取到 ${nodes.length} 个节点`);
```

## 工作流程

```
┌─────────────────────────────────────────┐
│  1. 下载付费订阅节点                      │
│     ↓                                    │
│  2. 创建Clash配置                        │
│     ↓                                    │
│  3. 启动Clash代理 (7950/7951端口)       │
│     ↓                                    │
│  4. 通过代理获取各来源节点                │
│     ├─ Linux.do (需要Cookie)            │
│     ├─ 免费订阅源1                       │
│     └─ 免费订阅源2                       │
│     ↓                                    │
│  5. 停止Clash代理                        │
│     ↓                                    │
│  6. 合并去重保存                         │
└─────────────────────────────────────────┘
```

## 输出文件

所有获取的节点保存在 `fetched_nodes/` 目录：

- `premium_nodes.json` - 付费订阅节点
- `linuxdo_nodes.json` - Linux.do节点
- `free_nodes.json` - 免费订阅节点
- `all_nodes.json` - 合并去重后的所有节点

## 配置说明

### 代理端口

- HTTP代理: `7950`
- SOCKS5代理: `7951`

### 订阅源配置

在 `fetch_all_nodes.js` 中的 `SOURCES` 对象：

```javascript
const SOURCES = {
    premium: {
        url: '付费订阅链接',
        needProxy: false
    },
    linuxdo: {
        url: 'https://linux.do/t/topic/1590573.json',
        needProxy: true,
        needCookie: true
    }
};
```

## 依赖要求

- Node.js
- Clash二进制 (`clash-linux-amd64`)
- curl命令
- js-yaml模块

## Cookie管理

Linux.do需要有效的Cookie才能访问受限内容：

1. Cookie文件位置: `linuxdo_cookie.txt`
2. 获取方法: 参见 `VNC_CHROME_PROXY_GUIDE.md`
3. Cookie格式: `_t=xxx; _forum_session=yyy`

## 错误处理

脚本会自动处理以下情况：

- Cookie失效 → 跳过Linux.do，继续其他源
- 代理启动失败 → 终止流程
- 单个订阅源失败 → 记录错误，继续其他源
- 中断信号 (Ctrl+C) → 自动清理并停止代理

## 集成到Web界面

在 `app.js` 中添加API端点：

```javascript
// 触发全网节点获取
app.post('/api/fetch-all-nodes', async (req, res) => {
    const { main } = require('./fetch_all_nodes');
    
    try {
        const nodes = await main();
        res.json({ 
            success: true, 
            count: nodes.length,
            message: '节点获取成功'
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});
```

## 定时任务

使用cron定时更新节点：

```bash
# 每6小时更新一次
0 */6 * * * cd /path/to/Aggregator && node fetch_all_nodes.js >> logs/fetch.log 2>&1
```

## 注意事项

1. **代理端口冲突**: 确保7950/7951端口未被占用
2. **Cookie有效期**: Linux.do的Cookie可能会过期，需要定期更新
3. **资源清理**: 脚本会自动清理Clash进程，但异常退出时可能需要手动清理
4. **网络超时**: 默认超时30秒，网络不稳定时可能需要调整

## 故障排查

### 代理无法启动

```bash
# 检查Clash二进制
ls -la clash_bin/clash-linux-amd64

# 检查端口占用
netstat -tlnp | grep 7950
```

### Linux.do访问失败

```bash
# 测试Cookie
bash quick_test_cookie.sh

# 重新获取Cookie
# 参见 VNC_CHROME_PROXY_GUIDE.md
```

### 节点数量为0

```bash
# 查看详细日志
node fetch_all_nodes.js

# 检查订阅链接是否有效
curl -I https://16412.nginx24ppy.xyz/link/hXvsVfrh8PP0ViD3?clash=1
```
