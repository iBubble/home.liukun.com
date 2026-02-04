# NodeLocalChecker IP纯净度缓存优化完成

**日期**: 2026-02-05  
**优化**: 避免重复检测IP纯净度,减少第三方API调用

## 优化背景

### 问题
- IP纯净度短时间内不会变化
- 每次检测都调用第三方API会造成:
  - API调用频率过高
  - 可能触发API限流
  - 增加检测时间
  - 浪费资源

### 解决方案
只对**新增且可用**的节点进行IP纯净度检测,已有纯净度数据的节点直接使用缓存数据。

## 实现逻辑

### 检测流程

```
开始检测节点
    ↓
节点可用? → 否 → 返回不可用结果
    ↓ 是
获取到真实IP? → 否 → 返回结果(无IP信息)
    ↓ 是
检查节点是否已有purity数据?
    ↓
    ├─ 有 → 直接使用缓存的purity数据 ✅
    │       (避免重复调用API)
    │
    └─ 无 → 调用第三方API检测IP纯净度 🔍
            保存检测结果到数据库
```

### 代码实现

在 `api/check.php` 中:

```php
// 如果节点可用且获取到了真实IP
if ($checkResult['available'] && !empty($checkResult['real_ip'])) {
    // 检查节点是否已有IP纯净度数据
    $existingPurity = isset($node['purity']) && !empty($node['purity']) 
        ? $node['purity'] 
        : null;
    
    if ($existingPurity && isset($existingPurity['score'])) {
        // ✅ 已有纯净度数据,直接使用(不调用API)
        $responseData['purity'] = $existingPurity;
    } else {
        // 🔍 没有纯净度数据,进行检测(调用API)
        $purityResult = checkIPPurityInternal($checkResult['real_ip']);
        if ($purityResult) {
            $responseData['purity'] = $purityResult;
        }
    }
}
```

## 使用场景

### 场景1: 首次检测新节点
```
节点: 新导入的节点
状态: 未检测过
purity: null

检测流程:
1. 检测节点连通性 ✓
2. 获取真实IP ✓
3. 检查purity字段 → null
4. 🔍 调用API检测IP纯净度
5. 保存结果到数据库
```

### 场景2: 重新检测已有节点
```
节点: 之前检测过的节点
状态: 已检测
purity: { score: 85, level: "良好", ... }

检测流程:
1. 检测节点连通性 ✓
2. 获取真实IP ✓
3. 检查purity字段 → 有数据
4. ✅ 直接使用缓存数据(不调用API)
5. 更新其他检测结果
```

### 场景3: 节点IP变化
```
节点: IP地址发生变化
旧IP: 1.2.3.4 (purity: 85分)
新IP: 5.6.7.8

当前实现:
- 仍使用旧的purity数据
- 如需更新,可手动清除purity字段

未来优化:
- 可以比对real_ip字段
- IP变化时自动重新检测
```

## 优化效果

### API调用减少

假设有100个节点:

**优化前**:
- 首次检测: 100次API调用
- 第二次检测: 100次API调用
- 第三次检测: 100次API调用
- **总计**: 300次API调用

**优化后**:
- 首次检测: 100次API调用
- 第二次检测: 0次API调用 ✅
- 第三次检测: 0次API调用 ✅
- **总计**: 100次API调用

**节省**: 66.7%的API调用

### 检测速度提升

- 不调用API的节点检测速度提升约2-5秒
- 100个已检测节点可节省200-500秒

### 资源节省

- 减少网络请求
- 降低第三方API压力
- 避免触发API限流
- 节省服务器资源

## 数据结构

### 节点数据示例

```json
{
    "node_hash": "abc123",
    "name": "美国节点1",
    "server": "1.2.3.4",
    "port": 443,
    "available": 1,
    "real_ip": "1.2.3.4",
    "purity": {
        "score": 85,
        "level": "良好",
        "type": "住宅IP",
        "risk_score": 80,
        "location": {
            "country": "美国",
            "city": "洛杉矶",
            "isp": "AT&T"
        }
    },
    "last_check_time": 1770225777,
    "check_count": 3,
    "success_count": 3
}
```

## 手动清除缓存

如果需要强制重新检测IP纯净度,可以:

### 方法1: 通过API清除
```bash
# 清除单个节点的purity数据
curl -X POST https://home.liukun.com:8443/Projects/NodeLocalChecker/api/nodes.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "clear_purity",
    "node_hash": "abc123"
  }'
```

### 方法2: 直接编辑数据文件
```bash
# 编辑 data/nodes.json
# 将对应节点的 "purity" 字段设置为 null
```

### 方法3: 删除节点重新导入
```
1. 删除节点
2. 重新导入YAML
3. 重新检测(会调用API)
```

## 未来优化方向

### 1. IP变化检测
```php
// 比对IP是否变化
if ($node['real_ip'] !== $checkResult['real_ip']) {
    // IP变化了,重新检测纯净度
    $purityResult = checkIPPurityInternal($checkResult['real_ip']);
}
```

### 2. 定期更新策略
```php
// 超过30天的数据重新检测
$lastCheckTime = $node['purity_check_time'] ?? 0;
if (time() - $lastCheckTime > 30 * 86400) {
    // 重新检测
}
```

### 3. 手动刷新按钮
```javascript
// 在界面添加"刷新IP纯净度"按钮
function refreshPurity(nodeIndex) {
    // 清除purity数据
    // 重新检测
}
```

## 注意事项

1. **IP变化**: 当前实现不会自动检测IP变化,如果节点IP变化,仍会使用旧的纯净度数据
2. **数据时效性**: IP纯净度数据可能随时间变化,建议定期清除缓存重新检测
3. **API限流**: 即使有缓存,首次检测大量节点时仍需注意API限流

## 相关文档

- [IP纯净度检测完成](./NodeLocalChecker_IP纯净度检测完成_2026-02-05.md)
- [节点持久化完成](./NodeLocalChecker_节点持久化完成_2026-02-05.md)
- [历史检测结果显示](./NodeLocalChecker_历史检测结果显示_2026-02-05.md)
- [完整功能总结](./NodeLocalChecker_完整功能总结_2026-02-05.md)

---

**完成时间**: 2026-02-05  
**优化效果**: 减少66.7%的API调用  
**部署状态**: ✅ 已部署
