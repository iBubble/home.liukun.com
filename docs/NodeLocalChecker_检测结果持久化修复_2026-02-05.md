# NodeLocalChecker 检测结果持久化修复

**日期**: 2026-02-05  
**状态**: ✅ 已完成

## 问题描述

用户反馈:检测完毕后刷新页面,节点的延迟、可用性、纯净度数据都消失了,说明检测结果没有持久化保存到数据库。

## 问题分析

### 原有实现
1. ✅ 前端有`saveCheckResult()`函数
2. ✅ 后端有`update_check` API接口
3. ✅ storage.php有`updateCheckResult()`方法
4. ❌ **问题**: storage.php只保存了`purity`对象,没有保存`ip_purity_score`字段

### 数据结构不一致
- **后端保存**: `purity` 对象 (包含score, level, type等)
- **前端排序**: 使用`ip_purity_score`字段
- **结果**: 刷新后前端无法读取到纯净度分数

## 解决方案

修改`storage.php`中的`updateCheckResult()`方法,在保存`purity`对象的同时,提取`score`字段保存到`ip_purity_score`:

```php
public function updateCheckResult($nodeHash, $result) {
    $nodes = $this->getAllNodes();
    $found = false;
    
    foreach ($nodes as &$node) {
        if ($node['node_hash'] === $nodeHash) {
            $node['available'] = $result['available'] ? 1 : 0;
            $node['latency'] = $result['latency'] ?? null;
            $node['real_ip'] = $result['real_ip'] ?? null;
            $node['purity'] = $result['purity'] ?? null;
            
            // 同时保存ip_purity_score字段,方便前端排序
            if (isset($result['purity']['score'])) {
                $node['ip_purity_score'] = $result['purity']['score'];
            } else {
                $node['ip_purity_score'] = null;
            }
            
            $node['last_check_time'] = time();
            $node['check_count'] = ($node['check_count'] ?? 0) + 1;
            if ($result['available']) {
                $node['success_count'] = ($node['success_count'] ?? 0) + 1;
            }
            $node['updated_at'] = time();
            $found = true;
            break;
        }
    }
    
    if ($found) {
        file_put_contents($this->dataFile, json_encode($nodes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    return $found;
}
```

## 修改内容

### 文件: `Projects/NodeLocalChecker/api/storage.php`

**新增代码**:
```php
// 同时保存ip_purity_score字段,方便前端排序
if (isset($result['purity']['score'])) {
    $node['ip_purity_score'] = $result['purity']['score'];
} else {
    $node['ip_purity_score'] = null;
}
```

## 测试验证

### 测试脚本: `Processes/test_save_check_result.php`

测试结果:
```
✅ available字段
✅ latency字段
✅ real_ip字段
✅ ip_purity_score字段
✅ purity对象
```

### 保存的数据结构
```json
{
    "available": 1,
    "latency": "123.45",
    "real_ip": "1.2.3.4",
    "ip_purity_score": 95,
    "purity": {
        "score": 95,
        "level": "优秀",
        "type": "住宅IP",
        "location": {
            "country": "美国",
            "city": "洛杉矶"
        }
    },
    "last_check_time": 1770237840
}
```

## 数据流程

### 检测流程
1. 用户点击"开始检测"
2. 前端调用`api/check.php`检测节点
3. 检测完成后调用`saveCheckResult()`
4. `saveCheckResult()`调用`api/nodes.php?action=update_check`
5. 后端`updateCheckResult()`保存结果到`data/nodes.json`

### 保存的字段
- `available`: 可用性 (0/1)
- `latency`: 延迟 (ms)
- `real_ip`: 真实IP
- `purity`: 纯净度对象 (完整信息)
- `ip_purity_score`: 纯净度分数 (用于排序)
- `last_check_time`: 最后检测时间
- `check_count`: 检测次数
- `success_count`: 成功次数

### 刷新后的数据加载
1. 页面加载时调用`api/nodes.php?action=list`
2. 返回所有节点数据(包含检测结果)
3. 前端显示延迟、IP、纯净度等信息
4. 排序功能使用`ip_purity_score`字段

## 使用测试

### 测试步骤
1. 访问 https://home.liukun.com:8443/Projects/NodeLocalChecker/
2. 导入节点
3. 选择节点并点击"开始检测"
4. 等待检测完成
5. **刷新页面**
6. 验证延迟、可用性、纯净度数据是否保留

### 预期结果
✅ 刷新后所有检测数据保留  
✅ 延迟显示正常  
✅ 可用性状态正常  
✅ IP纯净度显示正常  
✅ 按纯净度排序功能正常

## 相关文档

- 纯净度排序: `docs/NodeLocalChecker_纯净度排序功能_2026-02-05.md`
- IP纯净度检测: `docs/NodeLocalChecker_IP纯净度检测完成_2026-02-05.md`
- 节点持久化: `docs/NodeLocalChecker_节点持久化完成_2026-02-05.md`

## 技术细节

### 为什么需要两个字段?

1. **purity对象**: 保存完整的纯净度信息
   - score: 分数
   - level: 等级
   - type: IP类型
   - location: 位置信息

2. **ip_purity_score字段**: 用于快速排序
   - 避免在排序时访问嵌套对象
   - 提高排序性能
   - 简化前端代码

### 数据冗余的权衡
虽然`ip_purity_score`是`purity.score`的冗余,但这种设计:
- ✅ 提高了排序性能
- ✅ 简化了前端代码
- ✅ 保持了数据完整性
- ❌ 增加了少量存储空间(可接受)
