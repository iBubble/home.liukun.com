# Aggregator 代理设置说明

**日期**: 2026-01-29  
**状态**: ✅ 配置已修复

## 问题发现

通过日志分析发现，之前的配置文件中爬取功能并未真正禁用：
- `crawl.enable` 仍然是 `true`
- `telegram.enable` 仍然是 `true`
- `github.enable` 仍然是 `true`

导致系统仍在爬取 Telegram 的 jichang_list 频道（899个机场），耗时很长。

## 修复内容

### 1. 完全禁用所有爬取功能

修改 `Projects/Aggregator/external/aggregator/subscribe/config/config.json`：

```json
{
    "crawl": {
        "enable": false,      // ✅ 已禁用
        "telegram": {
            "enable": false,  // ✅ 已禁用
        },
        "github": {
            "enable": false,  // ✅ 已禁用
        },
        "google": {
            "enable": false   // ✅ 已禁用
        },
        "yandex": {
            "enable": false   // ✅ 已禁用
        },
        "twitter": {
            "enable": false   // ✅ 已禁用
        }
    }
}
```

### 2. 验证配置

运行验证脚本：

```bash
bash Processes/verify_config.sh
```

输出结果：
```
✓ 所有爬取功能已禁用
✓ 订阅源文件存在，包含 5 个订阅源
```

## 当前配置

### 订阅源列表

`Projects/Aggregator/data/my_sources.txt` 包含 5 个高质量订阅源：

1. https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt
2. https://raw.githubusercontent.com/freefq/free/master/v2
3. https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2
4. https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub
5. https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray

### 扫描参数

`Projects/Aggregator/scan.php` 使用以下参数：

```php
$cmd = "python3 subscribe/collect.py --skip --num 200 --targets clash --refresh --yourself " . escapeshellarg($mysourcesFile);
```

参数说明：
- `--skip`: 跳过节点可用性检查（加快速度）
- `--num 200`: 使用 200 线程高速扫描
- `--targets clash`: 只生成 Clash 格式
- `--refresh`: 只更新已有订阅，不注册新机场
- `--yourself`: 指定自定义订阅源列表

## 预期效果

修复后的扫描应该：
- ✅ 不爬取任何机场网站
- ✅ 只从 5 个 GitHub 订阅源获取节点
- ✅ 扫描时间从 5 分钟降低到 10 秒左右
- ✅ 任务数从 899 降低到 11 左右

## 测试方法

### 快速测试

```bash
# 清空旧数据
rm -f Projects/Aggregator/data/nodes.json
rm -f Projects/Aggregator/external/aggregator/data/clash.yaml

# 运行扫描
php Projects/Aggregator/scan.php

# 查看日志
tail -50 Projects/Aggregator/logs/real_scan.log
```

### 验证结果

检查日志中是否包含：
- ❌ 不应该出现：`[AirPortCrawl] start collect airport`
- ❌ 不应该出现：`jichang_list`
- ✅ 应该出现：`--yourself`
- ✅ 应该出现：`--refresh`

## 相关文件

- `Projects/Aggregator/external/aggregator/subscribe/config/config.json` - 配置文件
- `Projects/Aggregator/data/my_sources.txt` - 订阅源列表
- `Projects/Aggregator/scan.php` - 扫描脚本
- `Processes/verify_config.sh` - 配置验证脚本

## 下一步

1. 运行一次完整扫描测试
2. 验证节点数量和质量
3. 确认扫描时间是否符合预期
4. 如果一切正常，启用自动扫描（Cron）
