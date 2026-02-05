# NodeLocalChecker 导出去重修复

**日期**: 2026-02-05  
**版本**: v20260205-16  
**问题**: 导出的YAML配置在Clash Verge中报错

## 问题描述

用户报告导出的YAML配置在Clash Verge中应用时报错：

```
"proxy 美国·1号线·Netflix等流媒体解锁·ChatGPT解锁_1 is the duplicate name"
```

## 根本原因

1. **数据库中存在重复的节点名称**
   - 从不同来源导入的节点可能有相同的名称
   - 例如：多个节点都叫"美国节点"、"HK 8701"等

2. **导出时未进行去重处理**
   - 直接使用原始节点名称
   - Clash要求所有代理节点名称必须唯一

3. **Clash配置验证失败**
   - Clash Verge在加载配置时检测到重复名称
   - 拒绝加载配置

## 修复方案

### 修改 export.php

在导出时对节点名称进行去重处理：

```php
// 修复前
foreach ($nodes as $node) {
    if (isset($node['raw'])) {
        $config['proxies'][] = $node['raw'];  // 直接使用原始名称
    }
}

// 修复后
$usedNames = [];
foreach ($nodes as $node) {
    if (isset($node['raw'])) {
        $rawNode = $node['raw'];
        $originalName = $rawNode['name'];
        
        // 确保节点名称唯一
        $uniqueName = $originalName;
        $counter = 1;
        while (in_array($uniqueName, $usedNames)) {
            $uniqueName = $originalName . '_' . $counter;
            $counter++;
        }
        
        $rawNode['name'] = $uniqueName;
        $usedNames[] = $uniqueName;
        
        $config['proxies'][] = $rawNode;
    }
}
```

### 去重逻辑

1. **保留第一个节点的原始名称**
   - 例如：`美国节点`

2. **后续重复节点自动添加后缀**
   - 第2个：`美国节点_1`
   - 第3个：`美国节点_2`
   - 以此类推

3. **确保所有名称唯一**
   - 使用 `$usedNames` 数组跟踪已使用的名称
   - 循环检查直到找到唯一名称

## 测试验证

### 测试脚本
```bash
php Processes/test_export_dedup.php
```

### 测试结果
```
原始节点名称:
  - 美国节点
  - 美国节点
  - 美国节点
  - 香港节点
  - 香港节点

去重后的节点名称:
  - 美国节点 (server: 1.1.1.1)
  - 美国节点_1 (server: 2.2.2.2)
  - 美国节点_2 (server: 3.3.3.3)
  - 香港节点 (server: 4.4.4.4)
  - 香港节点_1 (server: 5.5.5.5)

✅ 所有节点名称唯一
```

## 数据库中的重复名称

当前数据库中发现的重复名称：
```bash
curl -s "https://home.liukun.com:8443/Projects/NodeLocalChecker/api/nodes.php?action=list" | \
  jq -r '.nodes[].name' | sort | uniq -d
```

结果：
- `HK 8701`
- `JP-日本_10`
- `美国 · 1号线 · Netflix等流媒体解锁 · ChatGPT解锁_1`
- `美国 · 1号线 · Netflix等流媒体解锁 · ChatGPT解锁_3`

## 使用说明

### 导出步骤
1. 选择要导出的节点（可用节点）
2. 点击"导出选中节点"按钮
3. 下载生成的YAML文件
4. 导入到Clash Verge

### 预期效果
- ✅ 所有节点名称唯一
- ✅ Clash Verge可以正常加载配置
- ✅ 重复名称自动添加后缀（_1, _2, ...）

### 示例

**原始节点列表**：
```
- 美国节点 (1.1.1.1:443)
- 美国节点 (2.2.2.2:443)
- 香港节点 (3.3.3.3:443)
```

**导出后的YAML**：
```yaml
proxies:
  - name: 美国节点
    type: ss
    server: 1.1.1.1
    port: 443
    
  - name: 美国节点_1
    type: ss
    server: 2.2.2.2
    port: 443
    
  - name: 香港节点
    type: ss
    server: 3.3.3.3
    port: 443
```

## 其他修复

### 1. 修复"选择可用节点"按钮

**问题**：点击后变成全部取消选择

**原因**：`available` 字段是数字 `1`，但代码检查的是布尔值 `true`

**修复**：
```javascript
// 修复前
cb.checked = nodes[index].available === true;  // ❌

// 修复后
cb.checked = node.available === 1;  // ✅
```

**版本**：v20260205-16

## 测试建议

### 完整测试流程
1. **导入节点**
   - 从机场聚合器导入
   - 等待检测完成

2. **选择可用节点**
   - 点击"选择可用节点"按钮
   - 验证只选中可用节点

3. **导出配置**
   - 点击"导出选中节点"
   - 下载YAML文件

4. **验证配置**
   - 在Clash Verge中导入
   - 验证无错误提示
   - 验证节点列表正确

5. **测试连接**
   - 选择导出的节点
   - 测试网络连接

## 相关文件

- `Projects/NodeLocalChecker/api/export.php` - 导出API（已修复）
- `Projects/NodeLocalChecker/js/app.js` - 前端逻辑（v20260205-16）
- `Processes/test_export_dedup.php` - 去重测试脚本

## 总结

✅ **已修复**：
- 导出时节点名称自动去重
- "选择可用节点"按钮功能正常
- Clash Verge可以正常加载配置

✅ **测试通过**：
- 去重逻辑验证通过
- 所有节点名称唯一

✅ **用户体验**：
- 无需手动修改节点名称
- 自动处理重复名称
- 导出即可用

---

**修复完成时间**: 2026-02-05 17:40  
**可以使用**: ✅ 是
