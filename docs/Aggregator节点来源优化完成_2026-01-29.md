# Aggregator节点来源优化完成

**日期**: 2026-01-29  
**状态**: ✅ 已完成

## 问题背景

之前的配置会爬取899个机场网站，导致：
- 扫描速度慢
- 获取的节点质量参差不齐
- 很多节点包含"请使用最新版客户端"等无效信息

## 解决方案

### 1. 完全禁用机场爬取

修改 `Projects/Aggregator/external/aggregator/subscribe/config/config.json`：

```json
{
    "crawl": {
        "enable": false,  // 禁用爬取
        "telegram": { "enable": false },
        "google": { "enable": false },
        "yandex": { "enable": false },
        "github": { "enable": false },
        "twitter": { "enable": false },
        "repositories": [],
        "pages": [],
        "scripts": []
    }
}
```

### 2. 只使用GitHub共享订阅源

创建 `Projects/Aggregator/data/my_sources.txt`，包含5个高质量订阅源：

```
# peasoft/NoMoreWalls - 高质量聚合订阅
https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt

# freefq/free - 免费节点聚合
https://raw.githubusercontent.com/freefq/free/master/v2

# aiboboxx/v2rayfree - V2Ray免费节点
https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2

# Pawdroid/Free-servers - 免费服务器列表
https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub

# mfuu/v2ray - V2Ray节点聚合
https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray
```

### 3. 使用 --refresh 模式

修改 `Projects/Aggregator/scan.php`，使用 `--refresh` 参数：

```php
// --refresh: 只更新已有订阅，不注册新机场
// --yourself: 指定自定义订阅源列表
$cmd = "python3 subscribe/collect.py --skip --num 200 --targets clash --refresh --yourself " . escapeshellarg($mysourcesFile);
```

## 优化效果

### 对比数据

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 任务数 | 899 | 11 | ↓ 98.8% |
| 扫描时间 | ~5分钟 | ~10秒 | ↓ 95% |
| 节点质量 | 参差不齐 | 高质量 | ✅ |
| 无效节点 | 很多 | 自动过滤 | ✅ |

### 实际测试结果

```bash
✅ 没有爬取机场
任务数: 11
原始节点数: 51
有效节点数: 13 (过滤掉9个无效节点)
```

## 节点过滤规则

`parse_nodes.py` 会自动过滤以下节点：
- 包含"请使用最新版客户端"字样
- 包含"剩余流量"、"套餐到期"等信息节点
- 包含"故障报修"、"邮箱"等非代理节点

## 累加模式

- **不使用 `--overwrite` 参数**：新扫描的节点会累加到现有节点
- **parse_nodes.py 合并模式**：保留现有节点的 delay 和 status 信息
- **节点数只增不减**：除非手动清空 `data/nodes.json`

## 使用方法

### 手动扫描

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
php scan.php
```

### 自动扫描（Cron）

```bash
# 每6小时扫描一次
0 */6 * * * cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator && php scan.php > /dev/null 2>&1
```

### 测试验证

```bash
bash /www/wwwroot/ibubble.vicp.net/Processes/test_final_aggregator.sh
```

## 访问地址

https://home.liukun.com:8443/Projects/Aggregator/

## 技术细节

### 工作流程

1. **读取订阅源** → `data/my_sources.txt`
2. **下载节点** → `collect.py --refresh --yourself`
3. **生成YAML** → `external/aggregator/data/clash.yaml`
4. **解析过滤** → `parse_nodes.py`
5. **保存结果** → `data/nodes.json`
6. **前端展示** → `index.html`

### 关键参数

- `--refresh`: 只更新已有订阅，不注册新机场
- `--yourself`: 指定自定义订阅源列表
- `--skip`: 跳过节点可用性检查（加快速度）
- `--num 200`: 使用200线程高速扫描
- `--targets clash`: 只生成Clash格式

## 后续优化建议

1. **添加更多高质量订阅源**：可以在 `data/my_sources.txt` 中添加
2. **定期更新订阅源列表**：GitHub上的订阅源可能会失效
3. **节点测速**：可以添加节点延迟测试功能
4. **节点去重**：相同server+port的节点只保留一个

## 相关文件

- `Projects/Aggregator/scan.php` - 扫描脚本
- `Projects/Aggregator/parse_nodes.py` - 节点解析和过滤
- `Projects/Aggregator/data/my_sources.txt` - 订阅源列表
- `Projects/Aggregator/external/aggregator/subscribe/config/config.json` - 配置文件
- `Processes/test_final_aggregator.sh` - 测试脚本
