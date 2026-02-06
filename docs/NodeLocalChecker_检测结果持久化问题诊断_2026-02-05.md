# NodeLocalChecker 检测结果持久化问题诊断

**日期**: 2026-02-05  
**问题**: 用户反馈检测完成后刷新页面,所有检测结果(延迟、可用性、纯净度)都消失了

## 问题分析

### 测试结果

1. **直接调用storage.php的updateCheckResult方法**: ✅ 成功
   - 数据正确写入nodes.json
   - 重新读取后数据保留

2. **模拟API逻辑调用**: ✅ 成功
   - API逻辑正确执行
   - 数据持久化成功

3. **前端fetch调用**: ❓ 待测试
   - 需要在浏览器中测试实际的网络请求

### 可能的原因

1. **前端调用时机问题**
   - `saveCheckResult`可能在检测完成前就被调用
   - 并发检测时可能存在竞态条件

2. **数据格式问题**
   - 前端传递的数据格式可能与后端期望不一致
   - `result.available`可能是boolean而不是1/0

3. **网络请求失败**
   - fetch请求可能因为某种原因失败
   - 但前端没有正确处理错误

4. **文件写入冲突**
   - 并发写入nodes.json可能导致数据丢失
   - PHP没有文件锁机制

## 诊断步骤

### 步骤1: 测试前端API调用

访问测试页面:
```
https://home.liukun.com:8443/Processes/test_frontend_api_call.html
```

点击"测试update_check接口"按钮,查看输出结果。

### 步骤2: 检查浏览器控制台

1. 打开NodeLocalChecker页面: `https://home.liukun.com:8443/Projects/NodeLocalChecker/`
2. 打开浏览器开发者工具(F12)
3. 切换到Console标签
4. 检测一个节点
5. 查看控制台输出,特别是:
   - `[保存] 开始保存检测结果`
   - `[保存] API响应`
   - 任何错误信息

### 步骤3: 检查网络请求

1. 在开发者工具中切换到Network标签
2. 检测一个节点
3. 查找`nodes.php?action=update_check`请求
4. 检查:
   - 请求方法(应该是POST)
   - 请求头(Content-Type应该是application/json)
   - 请求体(payload)
   - 响应状态码
   - 响应内容

## 潜在解决方案

### 方案1: 添加文件锁

修改`storage.php`的`updateCheckResult`方法,添加文件锁:

```php
public function updateCheckResult($nodeHash, $result) {
    $fp = fopen($this->dataFile, 'c+');
    if (flock($fp, LOCK_EX)) {
        $nodes = json_decode(fread($fp, filesize($this->dataFile)), true);
        
        // 更新逻辑...
        
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($nodes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}
```

### 方案2: 使用数据库

将节点数据从JSON文件迁移到SQLite数据库,避免并发写入问题。

### 方案3: 批量更新

不要每个节点检测完就立即保存,而是收集所有结果后批量更新:

```javascript
// 收集所有检测结果
const results = [];
for (const index of selectedIndexes) {
    const result = await checkNode(index);
    results.push({ node_hash: nodes[index].node_hash, result });
}

// 批量保存
await fetch('/api/nodes.php?action=batch_update', {
    method: 'POST',
    body: JSON.stringify({ results })
});
```

### 方案4: 添加重试机制

在前端添加重试逻辑:

```javascript
async function saveCheckResult(nodeHash, result, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(...);
            const data = await response.json();
            if (data.success) return true;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}
```

## 下一步

1. 运行前端测试页面确认问题
2. 检查浏览器控制台和网络请求
3. 根据测试结果选择合适的解决方案
4. 实施修复并验证

## 测试文件

- `Processes/test_direct_update.php` - 直接测试storage方法
- `Processes/test_update_api_direct.php` - 测试API逻辑
- `Processes/test_frontend_api_call.html` - 测试前端调用
