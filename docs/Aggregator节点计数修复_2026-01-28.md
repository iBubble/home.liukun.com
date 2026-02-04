# Aggregator 节点计数修复完成

**日期**: 2026-01-28  
**状态**: ✅ 已修复

## 问题描述

用户反馈节点数据始终显示0或55(旧数据),而Mac app几分钟就扫描到近100个节点。

## 根本原因

1. **YAML格式问题**: aggregator生成的`clash.yaml`使用紧凑格式 `- {name: xxx}`,而不是标准格式 `- name: xxx`
2. **计数方法错误**: 原代码使用 `substr_count($content, '- name:')` 无法识别紧凑格式
3. **数据源不一致**: `parse_nodes.py`只读取`data/clash.yaml`,没有读取实时数据源`external/aggregator/data/clash.yaml`

## 修复内容

### 1. 修复 `parse_nodes.py` (节点解析脚本)

**修改内容**:
- 优先从 `external/aggregator/data/clash.yaml` 读取实时数据
- 添加 `os` 模块导入
- 改进错误处理和日志输出
- 确保端口号转换为字符串格式

**文件**: `Projects/Aggregator/parse_nodes.py`

### 2. 修复 `api/index.php` (API接口)

**修改内容**:
- 修改 `getNodeCount()` 函数,使用正则表达式 `preg_match_all('/^\s+- name:/m')` 和 `preg_match_all('/^\s+- \{name:/m')`
- 支持两种YAML格式的节点计数
- 优先读取 `external/aggregator/data/clash.yaml` (实时数据)
- 其次读取 `data/nodes.json` (解析后的数据)

**文件**: `Projects/Aggregator/api/index.php`

### 3. 修复 `auto_scan.sh` (自动扫描脚本)

**修改内容**:
- 更新节点计数逻辑,支持两种YAML格式
- 使用 `grep -c "^  - name:"` 和 `grep -c "^  - {name:"` 分别计数
- 取两者中的较大值作为最终节点数

**文件**: `Projects/Aggregator/auto_scan.sh`

## 测试结果

### API测试
```bash
curl -s "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/status" | jq '.node_count'
# 输出: 95
```

### 节点解析测试
```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator
python3 parse_nodes.py
# 输出: ✅ 成功解析 95 个节点
```

### 数据验证
```bash
jq '. | length' data/nodes.json
# 输出: 95

grep -c "^  - {name:" external/aggregator/data/clash.yaml
# 输出: 95
```

## 当前状态

- ✅ 扫描任务正在运行 (PID: 972711)
- ✅ 已成功扫描 95 个节点
- ✅ API正确返回节点数: 95
- ✅ `nodes.json` 包含 95 个节点
- ✅ 前端界面能实时显示节点数

## 技术细节

### YAML格式对比

**标准格式**:
```yaml
proxies:
  - name: 节点1
    type: vmess
    server: example.com
    port: 443
```

**紧凑格式** (aggregator使用):
```yaml
proxies:
  - {name: 节点1, type: vmess, server: example.com, port: 443}
```

### 正则表达式说明

- `/^\s+- name:/m`: 匹配标准格式,`\s+`匹配行首空格,`m`标志启用多行模式
- `/^\s+- \{name:/m`: 匹配紧凑格式,`\{`转义花括号

## 后续优化建议

1. ✅ 已实现: 自动解析节点数据
2. ✅ 已实现: 实时读取aggregator数据
3. 待实现: 自动验证节点可用性
4. 待实现: 节点延迟测试
5. 待实现: 节点去重和优化

## 访问地址

https://home.liukun.com:8443/Projects/Aggregator/

## 相关文件

- `Projects/Aggregator/api/index.php` - API接口
- `Projects/Aggregator/parse_nodes.py` - 节点解析脚本
- `Projects/Aggregator/auto_scan.sh` - 自动扫描脚本
- `Projects/Aggregator/external/aggregator/data/clash.yaml` - 实时节点数据
- `Projects/Aggregator/data/nodes.json` - 解析后的节点数据
