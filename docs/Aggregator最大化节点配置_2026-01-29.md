# Aggregator 最大化节点配置

**日期**: 2026-01-29  
**状态**: ✅ 已优化

## 配置目标

**获取尽可能多的节点**，通过以下方式：
1. ✅ 启用 GitHub 爬取 - 发现更多订阅源
2. ✅ 启用 Telegram 爬取 - 获取机场信息
3. ✅ 使用 `--overwrite` 强制爬取
4. ✅ 优化爬取页数，平衡速度和数量

## 当前配置

### 1. config.json 设置

`Projects/Aggregator/external/aggregator/subscribe/config/config.json`:

```json
{
    "crawl": {
        "enable": true,           // ✅ 启用爬取
        "telegram": {
            "enable": true,       // ✅ 启用 Telegram
            "pages": 50,          // 优化：从 300 降到 50（平衡速度）
            "users": {
                "jichang_list": { ... }
            }
        },
        "github": {
            "enable": true,       // ✅ 启用 GitHub
            "pages": 5            // 爬取 5 页 GitHub 搜索结果
        },
        "google": {
            "enable": false       // 禁用（速度慢）
        },
        "yandex": {
            "enable": false       // 禁用（速度慢）
        }
    }
}
```

### 2. scan.php 命令

```php
// 使用 --overwrite 强制爬取，不依赖已有订阅源
$cmd = "python3 subscribe/collect.py --overwrite --skip --num 200 --targets clash 2>&1";
```

参数说明：
- `--overwrite`: **强制爬取** GitHub 和 Telegram，不依赖已有订阅
- `--skip`: 跳过节点可用性检查（加快速度）
- `--num 200`: 使用 200 线程高速扫描
- `--targets clash`: 只生成 Clash 格式

## 节点来源

### 主要来源

1. **Telegram jichang_list 频道**
   - 爬取最新 50 页
   - 包含大量机场订阅链接
   - 预计获取 100-300 个订阅源

2. **GitHub 搜索**
   - 搜索关键词：v2ray, clash, 订阅等
   - 爬取 5 页搜索结果
   - 预计发现 50-100 个订阅源

3. **自定义订阅源**
   - `data/my_sources.txt` 中的 5 个高质量源
   - 作为补充来源

### 节点累加模式

- **不使用 `--yourself` 参数**：不限制只用自定义源
- **使用 `--overwrite` 参数**：强制重新爬取
- **parse_nodes.py 合并模式**：保留现有节点的 delay 和 status
- **节点数只增不减**：除非手动清空

## 预期效果

### 节点数量

| 来源 | 预计订阅源数 | 预计节点数 |
|------|-------------|-----------|
| Telegram | 100-300 | 500-1500 |
| GitHub | 50-100 | 200-500 |
| 自定义源 | 5 | 50-100 |
| **总计** | **155-405** | **750-2100** |

### 扫描时间

- Telegram 50 页：约 2-3 分钟
- GitHub 5 页：约 30-60 秒
- 节点解析：约 30 秒
- **总计**：约 3-5 分钟

## 优化平衡

### 为什么 Telegram 只爬 50 页？

- 300 页耗时太长（10+ 分钟）
- 50 页已经包含最新的机场信息
- 可以根据需要调整

### 为什么 GitHub 只爬 5 页？

- 前 5 页已经包含最热门的订阅源
- 更多页面质量下降
- 可以根据需要调整

## 使用方法

### 手动扫描

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
php scan.php
```

### 查看进度

```bash
# 实时查看日志
tail -f Projects/Aggregator/logs/real_scan.log

# 查看任务数
grep -o 'Progress:' Projects/Aggregator/logs/real_scan.log | wc -l
```

### 检查结果

```bash
# 查看节点数
grep -o '"name":' Projects/Aggregator/data/nodes.json | wc -l

# 查看节点类型分布
grep '"type":' Projects/Aggregator/data/nodes.json | sort | uniq -c
```

## 进一步优化建议

### 如果想要更多节点

1. **增加 Telegram 页数**：
   ```json
   "pages": 100  // 从 50 增加到 100
   ```

2. **增加 GitHub 页数**：
   ```json
   "pages": 10   // 从 5 增加到 10
   ```

3. **启用 Google 搜索**（需要代理）：
   ```json
   "google": {
       "enable": true,
       "limits": 50
   }
   ```

### 如果想要更快速度

1. **减少 Telegram 页数**：
   ```json
   "pages": 20   // 从 50 减少到 20
   ```

2. **只使用自定义源**：
   ```php
   $cmd = "python3 subscribe/collect.py --yourself data/my_sources.txt --skip --num 200 --targets clash";
   ```

## 节点质量控制

`parse_nodes.py` 会自动过滤：
- ✅ 包含"请使用最新版客户端"的节点
- ✅ 包含"剩余流量"、"套餐到期"的节点
- ✅ 包含"故障报修"、"邮箱"的节点
- ✅ 重复的节点（相同 server+port）

## 访问地址

https://home.liukun.com:8443/Projects/Aggregator/

## 相关文件

- `Projects/Aggregator/external/aggregator/subscribe/config/config.json` - 配置文件
- `Projects/Aggregator/scan.php` - 扫描脚本
- `Projects/Aggregator/parse_nodes.py` - 节点解析和过滤
- `Processes/check_current_config.sh` - 配置检查脚本
