# Aggregator 扫描功能优化说明

生成时间: 2026-01-28

## 问题发现

用户反馈使用之前的app在30分钟内扫描到242个节点并验证了80个可用节点，而当前系统只扫描到73个节点，差距较大。

## 问题分析

### 1. 原因定位
- **错误的扫描脚本**: 之前调用的是根目录的 `collect.py`（只是一个模拟器，只生成5个示例节点）
- **正确的扫描脚本**: 应该调用 `subscribe/collect.py`（真正的扫描脚本）
- **配置不完整**: 默认配置中很多爬取来源是禁用状态

### 2. 当前扫描情况
- 现有订阅: 12个
- GitHub爬取: 59个域名
- 其他来源: 4个域名
- 最终有效节点: 73个
- 问题: 很多机场域名无法获取订阅（subscribe url is empty）

## 已实施的优化

### 1. 更新扫描脚本调用
**文件**: `auto_scan.sh`, `scan.php`

**优化前**:
```bash
python3 subscribe/collect.py --skip --overwrite --pages 5 --num 64 --targets clash
```

**优化后**:
```bash
python3 subscribe/collect.py --skip --overwrite --pages 15 --num 128 --targets clash --all
```

**参数说明**:
- `--pages 15`: 爬取15页Telegram频道（增加节点数量）
- `--num 128`: 使用128个线程（加快扫描速度）
- `--all`: 生成完整配置

### 2. 创建增强配置文件
**文件**: `external/aggregator/subscribe/config/config.json`

**启用的爬取来源**:
1. **Telegram频道**: 15页
2. **Google搜索**: 300个结果
3. **Yandex搜索**: 15页，7天内
4. **GitHub搜索**: 10页
5. **Twitter**: 100条推文
6. **GitHub仓库** (新增):
   - freefq/free
   - peasoft/NoMoreWalls
   - aiboboxx/v2rayfree
   - mfuu/v2ray
   - Pawdroid/Free-servers
7. **直接订阅页面** (新增):
   - freefq/free 的 v2 订阅
   - peasoft/NoMoreWalls 的列表
8. **爬取脚本**:
   - v2rayse
   - v2rayfree
   - purefast
   - gitforks

### 3. 订阅生成逻辑优化
**功能**: 支持手工勾选和自动选择两种模式

**手工点击"生成订阅链接"**:
- 如果勾选了节点 → 使用勾选的节点
- 如果没有勾选 → 自动使用前50个最快节点

**验证完成后自动生成**:
- 始终使用前50个最快节点
- 不受前端勾选影响

**计划任务自动生成**:
- 始终使用前50个最快节点
- 不受前端勾选影响

## 预期效果

通过以上优化，预期能够:
1. 扫描到更多节点（目标: 150-250个）
2. 提高有效节点比例
3. 加快扫描速度
4. 提供更稳定的订阅服务

## 使用建议

### 手动触发完整扫描
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
bash auto_scan.sh
```

### 查看扫描日志
```bash
tail -f logs/auto_scan.log
tail -f logs/scan_output.log
```

### 检查扫描结果
```bash
# 查看节点数量
grep -c '^\s\+- {name:' external/aggregator/data/clash.yaml

# 查看节点类型分布
grep 'type:' external/aggregator/data/clash.yaml | sort | uniq -c
```

## 下一步优化方向

1. **添加更多有效订阅源**: 持续收集和添加稳定的订阅源
2. **优化过滤规则**: 提高节点质量，过滤无效节点
3. **实现增量更新**: 避免每次都全量扫描
4. **添加节点去重**: 避免重复节点
5. **实现智能调度**: 根据时间和负载自动调整扫描频率

## 技术细节

### 配置文件位置
- 主配置: `external/aggregator/subscribe/config/config.json`
- 默认配置: `external/aggregator/subscribe/config/config.default.json`

### 数据文件位置
- 原始数据: `external/aggregator/data/clash.yaml`
- 项目数据: `data/clash.yaml`
- 节点JSON: `data/nodes.json`
- 订阅文件: `data/subscription.yaml`

### API接口
- 状态查询: `/api/index.php?path=/status`
- 开始扫描: `/api/index.php?path=/scan` (POST)
- 验证节点: `/api/index.php?path=/verify` (POST)
- 生成订阅: `/api/index.php?path=/generate-subscription` (POST)

## 总结

已完成从模拟器到真实扫描器的切换，并优化了配置以启用更多爬取来源。预期能够显著提高扫描到的节点数量，接近用户之前app的效果（242个节点）。

建议进行一次完整的扫描测试，观察实际效果，然后根据结果进一步调整配置参数。
