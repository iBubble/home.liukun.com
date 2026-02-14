# 自动化节点引导指南

## 问题背景

由于服务器在国内无法直连访问外网,存在"鸡生蛋"问题:
- 需要代理才能访问外网获取节点
- 需要节点才能建立代理

## 自动化解决方案

通过**MacBook定期推送节点**到服务器,实现完全自动化的节点获取和更新。

---

## 方案架构

```
MacBook (可访问外网)
  ↓
1. 从GitHub等公开源获取节点
  ↓
2. 通过HTTPS API推送到服务器
  ↓
服务器 (国内)
  ↓
3. 接收并保存为种子节点
  ↓
4. 自动触发全网抓取
  ↓
5. 使用种子节点作为代理
  ↓
6. 获取更多节点,形成良性循环
```

---

## 使用方法

### 一次性手动推送

在您的**MacBook**上执行:

```bash
# 1. 下载推送脚本
curl -O https://home.liukun.com:8443/Projects/Aggregator/push_nodes_from_mac.sh

# 2. 添加执行权限
chmod +x push_nodes_from_mac.sh

# 3. 运行脚本
./push_nodes_from_mac.sh
```

脚本会:
1. 从5个公开订阅源获取节点
2. 提取前30个有效节点
3. 通过HTTPS API推送到服务器
4. 服务器自动开始抓取更多节点

### 自动化定时推送 (推荐)

在MacBook上设置crontab,每天自动推送:

```bash
# 编辑crontab
crontab -e

# 添加以下行 (每天凌晨2点执行)
0 2 * * * /path/to/push_nodes_from_mac.sh >> /tmp/node_push.log 2>&1
```

---

## API接口说明

### 引导节点导入API

**端点**: `POST /api/bootstrap`

**请求格式**:
```json
{
  "source": "来源说明",
  "timestamp": "2026-02-08T13:00:00Z",
  "nodes": [
    "vmess://base64encodeddata",
    "vless://uuid@server:port?...",
    "trojan://password@server:port?..."
  ]
}
```

**响应格式**:
```json
{
  "success": true,
  "message": "成功导入 30 个引导节点",
  "imported": 30,
  "autoFetchTriggered": true
}
```

**功能**:
- 接收原始节点数据(vmess://等格式)
- 自动解析并保存为种子节点
- 自动触发全网抓取任务

---

## 手动推送方法

如果不想使用脚本,也可以手动推送:

### 方法1: 使用curl

```bash
# 在MacBook上执行
curl -k -X POST https://home.liukun.com:8443/Projects/Aggregator/api/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "source": "手动推送",
    "nodes": [
      "vmess://your_node_here",
      "vless://your_node_here"
    ]
  }'
```

### 方法2: 使用前端页面

1. 访问 https://home.liukun.com:8443/Projects/Aggregator/
2. 点击"手动添加订阅"
3. 粘贴节点或订阅链接
4. 点击"导入"

---

## 验证推送结果

### 1. 检查API响应
推送后应该看到:
```json
{
  "success": true,
  "message": "成功导入 30 个引导节点",
  "imported": 30,
  "autoFetchTriggered": true
}
```

### 2. 检查服务器日志
```bash
pm2 logs aggregator --lines 50
```

应该看到:
```
📥 收到引导节点: 30 个 (来源: MacBook自动推送)
✅ 引导节点已保存: 30 个
🚀 自动触发全网抓取...
```

### 3. 检查种子节点文件
```bash
cat Projects/Aggregator/seed_proxies.json | head -20
```

### 4. 等待抓取完成
5-10分钟后,访问前端页面查看节点数量

---

## 故障排查

### 问题1: MacBook无法访问GitHub
**解决**: 
- 使用VPN或代理
- 或者从其他可访问外网的设备运行脚本

### 问题2: 推送失败 (HTTP 500)
**原因**: 服务器端解析错误
**解决**: 
- 检查节点格式是否正确
- 查看服务器日志: `pm2 logs aggregator`

### 问题3: 推送成功但没有触发抓取
**原因**: 服务器正在执行其他任务
**解决**: 
- 等待当前任务完成
- 或手动触发: `curl -X POST http://127.0.0.1:3000/api/fetch_all -d '{"pages":10}'`

### 问题4: 节点推送后仍然无法使用
**原因**: 推送的节点可能已失效
**解决**: 
- 多推送几次,增加节点数量
- 从不同的订阅源获取节点
- 检查节点延迟: 访问前端页面查看

---

## 高级配置

### 自定义订阅源

编辑 `push_nodes_from_mac.sh`,修改 `SOURCES` 数组:

```bash
SOURCES=(
    "https://your-custom-source-1.com/sub"
    "https://your-custom-source-2.com/nodes"
    # 添加更多订阅源...
)
```

### 调整推送节点数量

修改脚本中的 `head -30` 为其他数字:

```bash
# 推送前50个节点
echo "$VALID_NODES" | head -50 | while IFS= read -r line; do
```

### 设置推送频率

修改crontab:

```bash
# 每12小时推送一次
0 */12 * * * /path/to/push_nodes_from_mac.sh

# 每6小时推送一次
0 */6 * * * /path/to/push_nodes_from_mac.sh
```

---

## 完全自动化流程

一旦设置完成,系统将完全自动运行:

1. **MacBook定时推送** (每天2:00 AM)
   - 从公开源获取最新节点
   - 推送到服务器

2. **服务器自动处理**
   - 接收并保存种子节点
   - 自动触发全网抓取
   - 使用种子节点作为代理

3. **持续更新**
   - 服务器定时任务 (每天0:10 AM)
   - 使用已有节点继续抓取
   - 保持节点池新鲜

4. **良性循环**
   - 节点越多,抓取能力越强
   - 抓取能力越强,节点越多
   - 系统自给自足

---

## 监控和维护

### 每日检查

```bash
# 检查节点数量
curl -s http://127.0.0.1:3000/api/status | grep -E "total|active"

# 检查最后更新时间
curl -s http://127.0.0.1:3000/api/status | grep lastUpdated

# 检查服务状态
pm2 status aggregator
```

### 每周维护

1. 访问前端页面
2. 检查节点质量
3. 清理失效节点
4. 查看抓取日志

### 紧急恢复

如果系统完全失效:

1. 在MacBook上运行推送脚本
2. 等待10分钟
3. 系统应该恢复正常

---

## 总结

通过这个自动化方案:
- ✅ 无需手动干预
- ✅ 每天自动更新节点
- ✅ 系统自给自足
- ✅ 完全解决"鸡生蛋"问题

**关键**: 只需在MacBook上设置一次crontab,之后就完全自动化了!
