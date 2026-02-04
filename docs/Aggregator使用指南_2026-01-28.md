# Aggregator 使用指南

## 快速开始

### 方式1：通过Web界面（推荐）

1. 访问：https://home.liukun.com:8443/Projects/Aggregator/
2. 点击"开始扫描"按钮
3. 等待2-5分钟
4. 点击"验证节点"测试可用性
5. 点击"生成订阅"获取订阅链接

### 方式2：通过命令行

```bash
# 安全扫描（推荐）
bash Projects/Aggregator/safe_scan.sh

# 或使用自动扫描脚本
bash Projects/Aggregator/auto_scan.sh
```

## 节点来源

### GitHub仓库来源（15个）

1. **freefq/free** - 免费节点收集
2. **peasoft/NoMoreWalls** - 翻墙节点
3. **aiboboxx/v2rayfree** - V2Ray免费节点
4. **mfuu/v2ray** - V2Ray节点分享
5. **Pawdroid/Free-servers** - 免费服务器
6. **PangTouY00/aggregator** - 节点聚合器
7. **KLafosne/mysubs** - 订阅分享
8. **ermaozi/get_subscribe** - 订阅获取
9. **mahdibland/V2RayAggregator** - V2Ray聚合
10. **Leon406/SubCrawler** - 订阅爬虫
11. **ebrasha/free-v2ray-public-list** - 免费V2Ray公共列表（每30分钟更新）
12. **Epodonios/v2ray-configs** - V2Ray配置（每5分钟更新）
13. **bj-wang/Free-nodes** - 免费节点
14. **VPN-Subcription-Links/ClashX-V2Ray-TopFreeProxy** - 精选免费VPN
15. **mahdibland/ShadowsocksAggregator** - Shadowsocks聚合

### 直接URL来源（5个）

1. freefq/free 的 v2 订阅
2. peasoft/NoMoreWalls 的列表
3. ebrasha/free-v2ray-public-list 的 base64 订阅
4. Epodonios/v2ray-configs 的全部配置
5. bj-wang/Free-nodes 的 Clash 订阅

### 其他来源

- **Telegram频道爬取**（15页）
- **Google搜索**（300个结果）
- **Yandex搜索**（15页，7天内）
- **GitHub搜索**（10页）
- **Twitter用户**（100条推文）
- **自定义脚本**（v2rayse, v2rayfree, purefast, gitforks）

## 代理配置

### 为什么需要代理？

服务器在国内，无法直接访问GitHub等国外节点源，需要通过代理访问。

### 配置步骤

1. 点击"代理配置"按钮
2. 填写代理信息：
   - 类型：SOCKS5
   - 地址：us.liukun.com
   - 端口：1080
   - 用户名：Gemini
   - 密码：Gl5181081
3. 点击"测试代理"
4. 测试成功后点击"保存配置"

### 代理自动降级

如果代理连接失败，系统会自动切换到直连模式，不会影响扫描。

## 节点过滤规则

系统会自动过滤以下无效节点：

- 包含"续费"、"到期"、"过期"的节点
- 包含"邮箱"、"客服"、"联系"的节点
- 包含"故障"、"维护中"的节点
- 包含"禁止"、"停用"的节点
- 包含"请使用最新版客户端"的节点

## 扫描流程

```
1. 读取配置文件
   ↓
2. 检查代理设置
   ↓
3. 从多个来源收集节点
   ├─ GitHub仓库（15个）
   ├─ 直接URL（5个）
   ├─ Telegram频道
   ├─ 搜索引擎
   └─ 自定义脚本
   ↓
4. 生成YAML配置
   ↓
5. 自动解析为JSON
   ↓
6. 过滤无效节点
   ↓
7. 保存到数据库
```

## 验证节点

### 自动验证

```bash
# 通过API验证
curl -X POST https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/verify \
  -H "Content-Type: application/json" \
  -d '{"speed_timeout": 3000}'
```

### 验证指标

- **延迟测试**：测试节点响应时间
- **可用性检测**：检查节点是否可连接
- **状态标记**：
  - active：可用（延迟<500ms）
  - slow：较慢（延迟≥500ms）
  - unknown：未测试

## 生成订阅

### 自动选择（推荐）

系统自动选择延迟最低的50个节点生成订阅。

### 手动选择

1. 在节点列表中勾选需要的节点
2. 点击"生成订阅"
3. 复制订阅链接

### 订阅链接

```
https://home.liukun.com:8443/Projects/Aggregator/data/subscription.yaml
```

## 自动化运行

### Cron任务

系统已配置两个自动任务：

```bash
# 每6小时自动扫描节点
0 */6 * * * /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/auto_scan.sh

# 每5分钟修复权限（备用）
*/5 * * * * /www/wwwroot/ibubble.vicp.net/Processes/fix_aggregator_once.sh
```

### 查看Cron日志

```bash
tail -f Projects/Aggregator/logs/cron.log
```

## 故障排查

### 问题1：扫描没有节点

**可能原因**：
- 代理连接失败
- 所有来源都无法访问
- 网络连接问题

**解决方案**：
1. 检查代理配置
2. 测试代理连接
3. 查看扫描日志：`tail -f Projects/Aggregator/logs/aggregator.log`
4. 尝试使用直连模式

### 问题2：权限错误

**可能原因**：
- nodes.json 文件权限不正确

**解决方案**：
```bash
# 自动修复
bash Processes/fix_aggregator_once.sh

# 或手动修复
sudo chown www:www Projects/Aggregator/data/nodes.json
sudo chmod 666 Projects/Aggregator/data/nodes.json
```

### 问题3：API返回错误

**可能原因**：
- PHP错误
- 数据文件损坏

**解决方案**：
1. 检查PHP错误日志
2. 重新解析节点：`python3 Projects/Aggregator/parse_nodes.py`
3. 测试API：`bash Processes/test_aggregator_complete.sh`

### 问题4：验证失败

**可能原因**：
- 节点数据为空
- 网络连接问题

**解决方案**：
1. 确保已执行扫描
2. 检查 nodes.json 是否存在
3. 查看API日志

## 高级功能

### 自定义过滤规则

编辑 `Projects/Aggregator/parse_nodes.py`，修改 `filter_keywords` 列表。

### 添加更多来源

编辑 `Projects/Aggregator/external/aggregator/subscribe/config/config.json`：

```json
{
  "crawl": {
    "repositories": [
      {
        "enable": true,
        "username": "your-username",
        "repo_name": "your-repo",
        "commits": 5,
        "exclude": "",
        "push_to": []
      }
    ],
    "pages": [
      {
        "enable": true,
        "url": "https://your-url.com/subscription",
        "include": "",
        "exclude": "",
        "multiple": false,
        "config": {"rename": ""},
        "push_to": []
      }
    ]
  }
}
```

### 调整扫描参数

编辑扫描脚本，修改参数：

```bash
python3 proxy_collect.py \
  --skip \           # 跳过已存在的订阅
  --overwrite \      # 覆盖现有数据
  --pages 10 \       # 搜索页数
  --num 128 \        # 线程数
  --targets clash \  # 目标格式
  --all              # 启用所有来源
```

## 性能优化

### 提高扫描速度

1. 增加线程数：`--num 256`
2. 减少搜索页数：`--pages 5`
3. 禁用某些来源（编辑config.json）

### 减少资源占用

1. 减少线程数：`--num 64`
2. 限制搜索范围
3. 禁用Telegram/Twitter爬取

## 安全建议

1. **定期更换代理**：避免代理被封禁
2. **备份配置**：定期备份 config.json
3. **监控日志**：定期检查错误日志
4. **更新来源**：定期检查来源是否有效

## 常用命令

```bash
# 完整检查
bash Processes/aggregator_final_check.sh

# 安全扫描
bash Projects/Aggregator/safe_scan.sh

# 手动解析
python3 Projects/Aggregator/parse_nodes.py

# 测试API
bash Processes/test_aggregator_complete.sh

# 查看日志
tail -f Projects/Aggregator/logs/aggregator.log

# 查看节点数
jq '. | length' Projects/Aggregator/data/nodes.json
```

## 技术支持

- 项目地址：https://home.liukun.com:8443/Projects/Aggregator/
- 文档目录：`docs/`
- 日志目录：`Projects/Aggregator/logs/`

## 更新日志

### 2026-01-28

- ✅ 新增5个GitHub仓库来源
- ✅ 新增3个直接URL来源
- ✅ 实现代理自动降级
- ✅ 完善错误处理
- ✅ 优化权限管理
- ✅ 添加安全扫描脚本
- ✅ 完善文档

---

**提示**：首次使用建议先运行 `bash Processes/aggregator_final_check.sh` 进行系统检查。
