# NodeLocalChecker JSON文件损坏修复

**日期**: 2026-02-05  
**问题**: 节点检测时不停报错"保存失败，请稍后手动保存"

## 问题诊断

### 1. 症状
- 前端检测节点时频繁显示保存失败错误
- 错误信息: `节点 7b09ceac... 保存失败,请稍后手动保存`

### 2. 排查过程

#### 检查权限
```bash
ls -la Projects/NodeLocalChecker/data/nodes.json
# -rwxrwxr-x 1 gemini www 423412 Feb  5 18:17
# ✓ 权限正常
```

#### 检查JSON格式
```bash
php -r "json_decode(file_get_contents('Projects/NodeLocalChecker/data/nodes.json'));"
# ✗ JSON解析失败: Syntax error
```

#### 定位错误
```bash
tail -20 Projects/NodeLocalChecker/data/nodes.json
# 发现文件末尾有重复的数据和格式错误:
# ]       },  <-- 多余的括号和逗号
#         "available": 0,
#         ...
#     }
```

### 3. 根本原因

**JSON文件在并发写入时损坏**

可能的原因:
1. 多个检测请求同时保存结果
2. PHP写入过程中被中断
3. 文件锁机制不完善

## 解决方案

### 立即修复

创建并运行修复脚本:

```bash
python3 Processes/fix_json_corruption.py
```

修复结果:
- ✓ 找到损坏位置: 行13293 列9
- ✓ 自动截断到最后一个有效JSON位置
- ✓ 去重处理: 345个节点，0个重复
- ✓ 验证修复成功
- ✓ 创建备份: `nodes.json.corrupt.20260205182214`

### 长期防护

#### 1. 添加文件锁机制

修改 `api/storage.php` 的 `updateCheckResult` 方法:

```php
public function updateCheckResult($nodeHash, $result) {
    // 使用文件锁防止并发写入
    $fp = fopen($this->dataFile, 'r+');
    if (!$fp) {
        error_log("[updateCheckResult] 无法打开文件");
        return false;
    }
    
    // 获取独占锁
    if (!flock($fp, LOCK_EX)) {
        error_log("[updateCheckResult] 无法获取文件锁");
        fclose($fp);
        return false;
    }
    
    try {
        // 读取数据
        $content = stream_get_contents($fp);
        $nodes = json_decode($content, true);
        
        // 更新节点
        $found = false;
        foreach ($nodes as &$node) {
            if ($node['node_hash'] === $nodeHash) {
                // ... 更新逻辑 ...
                $found = true;
                break;
            }
        }
        
        if ($found) {
            // 写入数据
            rewind($fp);
            ftruncate($fp, 0);
            fwrite($fp, json_encode($nodes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        
        return $found;
        
    } finally {
        // 释放锁并关闭文件
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}
```

#### 2. 添加JSON验证

在写入前验证JSON格式:

```php
$jsonData = json_encode($nodes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($jsonData === false) {
    error_log("[updateCheckResult] JSON编码失败: " . json_last_error_msg());
    return false;
}

// 验证可以解码
$verify = json_decode($jsonData, true);
if ($verify === null) {
    error_log("[updateCheckResult] JSON验证失败");
    return false;
}
```

#### 3. 添加自动备份

每次写入前创建备份:

```php
// 创建备份
$backupFile = $this->dataFile . '.backup.' . date('YmdHis');
copy($this->dataFile, $backupFile);

// 只保留最近10个备份
$backups = glob($this->dataFile . '.backup.*');
if (count($backups) > 10) {
    usort($backups, function($a, $b) {
        return filemtime($a) - filemtime($b);
    });
    foreach (array_slice($backups, 0, -10) as $old) {
        unlink($old);
    }
}
```

## 测试验证

### 测试脚本

```bash
# 1. 测试保存功能
php Processes/test_save_debug.php

# 2. 测试完整流程
bash Processes/test_complete_detection_flow.sh

# 3. 浏览器测试
# 访问: https://home.liukun.com:8443/Projects/NodeLocalChecker/
# 点击"检测所有节点"
```

### 验证结果

```
✓ 文件权限正常
✓ JSON格式正确
✓ 读取成功: 345个节点
✓ 写入测试通过
✓ 验证测试通过
```

## 预防措施

### 1. 监控JSON健康状态

创建定时检查脚本:

```bash
#!/bin/bash
# check_json_health.sh

DATA_FILE="/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/data/nodes.json"

if ! python3 -c "import json; json.load(open('$DATA_FILE'))" 2>/dev/null; then
    echo "⚠️ JSON文件损坏，正在修复..."
    python3 Processes/fix_json_corruption.py
    echo "✓ 修复完成"
fi
```

### 2. 添加到crontab

```bash
# 每小时检查一次
0 * * * * /www/wwwroot/ibubble.vicp.net/check_json_health.sh
```

### 3. 前端错误处理优化

在 `js/app.js` 中添加更详细的错误信息:

```javascript
catch (error) {
    console.error(`[保存] ✗ 保存失败:`, error);
    
    // 显示详细错误信息
    if (window.CyberpunkAnimations) {
        CyberpunkAnimations.showNotification(
            `保存失败: ${error.message}`,
            'error',
            5000
        );
    }
}
```

## 总结

### 问题
- JSON文件在并发写入时损坏
- 导致所有后续保存操作失败

### 解决
- ✓ 使用Python脚本自动修复损坏的JSON
- ✓ 添加文件锁机制防止并发写入
- ✓ 添加JSON验证和自动备份
- ✓ 创建健康检查脚本

### 影响
- 修复后节点检测和保存功能恢复正常
- 数据完整性得到保障
- 系统稳定性提升

## 相关文件

- 修复脚本: `Processes/fix_json_corruption.py`
- 测试脚本: `Processes/test_save_debug.php`
- 数据文件: `Projects/NodeLocalChecker/data/nodes.json`
- 备份文件: `Projects/NodeLocalChecker/data/nodes.json.corrupt.*`
