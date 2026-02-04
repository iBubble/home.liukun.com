# Aggregator 最终配置方案

**日期**: 2026-01-29  
**状态**: ✅ 已完成

## 配置策略

### 启用的功能
- ✅ **GitHub 爬取** - 发现更多订阅源（5页）
- ✅ **自定义订阅源** - 保证基础节点数量（5个高质量源）
- ✅ **crawl.enable = true** - 启用爬取框架

### 禁用的功能
- ❌ **Telegram 爬取** - 机场需要注册，浪费时间
- ❌ **Google 搜索** - 速度慢，需要代理
- ❌ **Yandex 搜索** - 速度慢
- ❌ **Twitter 爬取** - 不需要

## 配置文件

### config.json

`Projects/Aggregator/external/aggregator/subscribe/config/config.json`:

```json
{
    "crawl": {
        "enable": true,
        "telegram": {
            "enable": false    // ❌ 禁用
        },
        "github": {
            "enable": true,    // ✅ 启用
            "pages": 5         // 爬取5页
        },
        "google": {
            "enable": false    // ❌ 禁用
        },
        "yandex": {
            "enable": false    // ❌ 禁用
        },
        "twitter": {
            "enable": false    // ❌ 禁用
        }
    }
}
```

### scan.php

```php
// 同时使用 GitHub 爬取和自定义订阅源
$cmd = "python3 subscribe/collect.py --yourself " . escapeshellarg($mysourcesFile) . " --skip --num 200 --targets clash 2>&1";
```

参数说明：
- `--yourself`: 使用自定义订阅源列表
- `--skip`: 跳过节点可用性检查（加快速度）
- `--num 200`: 使用200线程
- `--targets clash`: 只生成Clash格式

### 自定义订阅源

`Projects/Aggregator/data/my_sources.txt`:

```
https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt
https://raw.githubusercontent.com/freefq/free/master/v2
https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2
https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub
https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray
```

## 节点来源

### 1. GitHub 爬取
- 搜索关键词：v2ray, clash, 订阅等
- 爬取5页搜索结果
- 预计发现：50-100个订阅源
- 预计节点：200-500个

### 2. 自定义订阅源
- 5个高质量GitHub聚合订阅
- 预计节点：50-200个

### 总计
- **订阅源数**：55-105个
- **预计节点数**：250-700个
- **扫描时间**：1-2分钟

## 优势

### 相比之前的配置

| 指标 | 旧配置（Telegram） | 新配置（GitHub+自定义） |
|------|-------------------|----------------------|
| 扫描时间 | 5-10分钟 | 1-2分钟 |
| 任务数 | 899 | 55-105 |
| 成功率 | 很低（需注册） | 很高（直接订阅） |
| 节点质量 | 参差不齐 | 较高 |
| 节点数量 | 不确定 | 250-700 |

### 为什么不用 Telegram？

1. **需要注册** - 大部分机场需要注册才能获取订阅链接
2. **成功率低** - 从日志看，大量机场返回空订阅
3. **浪费时间** - 爬取50页需要2-3分钟，但获取节点很少
4. **维护成本高** - 机场经常失效

### 为什么用 GitHub？

1. **直接订阅** - 不需要注册，直接获取订阅链接
2. **质量较高** - GitHub上的订阅源通常是聚合的
3. **更新及时** - 开源项目更新频繁
4. **发现新源** - 可以发现新的订阅源

## 使用方法

### 手动扫描

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
php scan.php
```

### 验证配置

```bash
bash /www/wwwroot/ibubble.vicp.net/Processes/verify_final_config.sh
```

### 快速测试（只用自定义源）

```bash
bash /www/wwwroot/ibubble.vicp.net/Processes/test_quick_sources.sh
```

## 监控和调试

### 查看实时日志

```bash
tail -f Projects/Aggregator/logs/real_scan.log
```

### 查看成功的订阅源

```bash
grep "count=\[" Projects/Aggregator/logs/real_scan.log | grep -v "count=\[0\]"
```

### 查看节点数

```bash
grep -c "^  - {name:" Projects/Aggregator/external/aggregator/data/clash.yaml
```

### 查看节点类型分布

```bash
grep "type:" Projects/Aggregator/external/aggregator/data/clash.yaml | grep -oP "type: \w+" | sort | uniq -c
```

## 进一步优化

### 如果节点数不够

1. **增加 GitHub 页数**：
   ```json
   "github": {
       "pages": 10  // 从5增加到10
   }
   ```

2. **添加更多自定义订阅源**：
   编辑 `data/my_sources.txt`，添加更多GitHub订阅源

3. **启用 Google 搜索**（需要代理）：
   ```json
   "google": {
       "enable": true,
       "limits": 50
   }
   ```

### 如果想要更快速度

1. **只使用自定义源**：
   ```php
   // 移除 GitHub 爬取，只用自定义源
   $cmd = "python3 subscribe/collect.py --yourself " . escapeshellarg($mysourcesFile) . " --skip --num 200 --targets clash --overwrite 2>&1";
   ```

2. **减少线程数**：
   ```php
   --num 100  // 从200减少到100
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
- `Projects/Aggregator/data/my_sources.txt` - 自定义订阅源
- `Projects/Aggregator/parse_nodes.py` - 节点解析和过滤
- `Processes/verify_final_config.sh` - 配置验证脚本
- `Processes/test_quick_sources.sh` - 快速测试脚本

## 总结

最终配置采用 **GitHub爬取 + 自定义订阅源** 的组合策略：
- ✅ 保证节点数量（250-700个）
- ✅ 保证节点质量（过滤无效节点）
- ✅ 缩短扫描时间（1-2分钟）
- ✅ 提高成功率（不依赖机场注册）
