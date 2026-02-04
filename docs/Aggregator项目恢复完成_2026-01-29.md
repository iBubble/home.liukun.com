# Aggregator 项目恢复完成

## 更新时间
2026-01-29 04:08

## 恢复说明

已恢复到下午六七点的完美版本配置。

## 当前配置

### config.json
```json
{
    "crawl": {
        "enable": true,  // 启用爬取
        "github": {
            "enable": true,
            "pages": 5
        },
        "telegram": {
            "enable": false  // 禁用 Telegram
        }
    }
}
```

### scan.php
- 简单直接的扫描命令
- 不使用代理（避免复杂性）
- 200 线程并发

## 当前状态

- ✅ 11 个可用节点
- ✅ 前端界面正常
- ✅ 订阅生成正常
- ✅ 扫描功能正常

## 使用方法

### 1. 手动扫描
```bash
php Projects/Aggregator/scan.php
```

### 2. 通过网页扫描
访问：https://home.liukun.com:8443/Projects/Aggregator/
点击"开始扫描"按钮

### 3. 查看节点
```bash
python3 -c "import json; data=json.load(open('Projects/Aggregator/data/nodes.json')); print(f'节点数: {len(data)}')"
```

### 4. 获取订阅
访问：https://home.liukun.com:8443/Projects/Aggregator/subscription.php

## 节点列表

当前 11 个节点：
1. 🇩🇪 德国-法兰克福-HY-002 (hysteria2)
2. 🇺🇸 美国B 01-1A (hysteria2)
3. 请续费 (vmess)
4. 🇺🇸 美国B 02-1B (hysteria2)
5. 🇹🇼 试用节点-台湾 (ss)
6. 🇺🇸 试用节点-美国 (ss)
7. 🇺🇸 美国B 01-1B (hysteria2)
8. 🇸🇬 试用节点-新加坡 (ss)
9. 🇺🇸 美国B 02-1A (hysteria2)
10. 🇯🇵 试用节点-日本 (ss)
11. 🇸🇬 免费节点 (vmess)

## 注意事项

1. **保持简单**：不要添加复杂的代理配置
2. **定期扫描**：每天扫描一次即可
3. **节点质量**：11 个节点已经够用
4. **稳定优先**：不要追求节点数量

## 完成状态

✅ 项目已恢复到完美工作状态
✅ 配置简单可靠
✅ 功能完整可用
