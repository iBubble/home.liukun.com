# 冷启动指南

## 问题说明

当 `proxies.json` 为空时，系统无法建立代理池来访问外网获取节点，形成"鸡生蛋"的循环依赖。

## 解决方案

### 方案1：手动导入初始节点（推荐）

1. **从其他设备获取节点**
   - 在可以访问外网的设备上运行一次获取
   - 将 `proxies.json` 复制到服务器

2. **使用公开订阅源**
   - 访问：https://github.com/ermaozi/get_subscribe
   - 复制订阅链接，在前端"手动添加订阅"中导入

3. **手动粘贴节点**
   - 从 Telegram、论坛等渠道获取节点链接
   - 在前端"原始内容"框中粘贴并导入

### 方案2：更新种子节点池

编辑 `seed_proxies.json`，添加真实可用的节点：

```bash
# 编辑种子节点文件
nano Projects/Aggregator/seed_proxies.json
```

**种子节点要求**：
- 必须是真实可用的节点
- 延迟 < 500ms（优质节点）
- 建议包含 5-10 个不同地区的节点
- 格式参考 `proxies.json` 的节点格式

### 方案3：临时使用其他代理

如果有其他可用的代理服务（如 VPN、Shadowsocks 客户端），可以：

1. 在本地启动代理（如 127.0.0.1:1080）
2. 修改系统环境变量：
   ```bash
   export http_proxy=http://127.0.0.1:1080
   export https_proxy=http://127.0.0.1:1080
   ```
3. 运行一次获取节点
4. 获取成功后取消环境变量

## 自动维护

一旦成功获取到节点后，系统会自动：

1. 保存所有有效节点到 `proxies.json`
2. 自动更新 `seed_proxies.json`（保留最快的20个节点）
3. 下次启动时优先使用 `proxies.json`
4. 如果 `proxies.json` 为空，自动降级到 `seed_proxies.json`

## 当前状态检查

```bash
# 检查节点数量
node -e "console.log('proxies.json:', require('./Projects/Aggregator/proxies.json').length)"
node -e "console.log('seed_proxies.json:', require('./Projects/Aggregator/seed_proxies.json').length)"

# 查看种子节点
cat Projects/Aggregator/seed_proxies.json | python3 -m json.tool
```

## 推荐的公开订阅源

以下是一些可以尝试的公开订阅源（需要在可访问外网的环境中使用）：

1. **ermaozi/get_subscribe**
   - https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt

2. **mianfeifq/share**
   - https://raw.githubusercontent.com/mianfeifq/share/main/data

3. **Pawdroid/Free-servers**
   - https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub

4. **freefq/free**
   - https://raw.githubusercontent.com/freefq/free/master/v2

## 注意事项

1. **种子节点质量很重要**
   - 种子节点必须是真实可用的
   - 建议定期更新种子节点
   - 不要使用延迟过高的节点

2. **首次获取建议**
   - 首次获取建议使用"仅更新 Github 节点"
   - 成功后再使用"全网获取节点"

3. **备份重要**
   - 定期备份 `proxies.json` 和 `seed_proxies.json`
   - 可以设置定时任务自动备份

## 故障排除

### 问题：所有代理都失败
**解决**：
1. 检查种子节点是否可用
2. 尝试更新种子节点
3. 临时使用直连模式（会失败但不影响系统）

### 问题：代理启动失败
**解决**：
1. 检查 Clash 二进制是否存在
2. 检查端口 7891 是否被占用
3. 查看日志：`pm2 logs aggregator`

### 问题：获取节点数量为0
**解决**：
1. 确认代理是否正常工作
2. 检查网络连接
3. 尝试增加重试次数
