# NodeLocalChecker 纯净度排序功能

**日期**: 2026-02-05  
**状态**: ✅ 已完成

## 功能说明

在排序选项中新增"按纯净度"排序功能,允许用户按IP纯净度分数对节点进行排序。

## 修改内容

### 1. HTML修改 (index.html)
在排序下拉框中新增"按纯净度"选项:

```html
<select id="sortOrder" onchange="sortNodes()">
    <option value="latency">按延迟 (快→慢)</option>
    <option value="purity">按纯净度 (高→低)</option>  <!-- 新增 -->
    <option value="name">按名称 (A→Z)</option>
    <option value="country">按国家 (A→Z)</option>
</select>
```

### 2. JavaScript修改 (app.js)
在`sortNodes()`函数中新增纯净度排序逻辑:

```javascript
else if (currentSort === 'purity') {
    // 按纯净度排序
    nodes.sort((a, b) => {
        // 获取纯净度分数 (0-100)
        const purityA = parseFloat(a.ip_purity_score) || -1;
        const purityB = parseFloat(b.ip_purity_score) || -1;
        
        // 有纯净度数据的节点排前面,按分数从高到低
        if (purityA >= 0 && purityB >= 0) {
            if (purityB !== purityA) {
                return purityB - purityA; // 分数高的排前面
            }
            // 分数相同时,按延迟排序
            const latencyA = parseFloat(a.latency) || 99999;
            const latencyB = parseFloat(b.latency) || 99999;
            return latencyA - latencyB;
        }
        
        // 有纯净度数据的排前面
        if (purityA >= 0) return -1;
        if (purityB >= 0) return 1;
        
        // 都没有纯净度数据时,可用节点排前面
        if (a.available === 1 && b.available === 1) {
            const latencyA = parseFloat(a.latency) || 99999;
            const latencyB = parseFloat(b.latency) || 99999;
            return latencyA - latencyB;
        }
        if (a.available === 1) return -1;
        if (b.available === 1) return 1;
        
        // 按名称排序
        return a.name.localeCompare(b.name, 'zh-CN');
    });
}
```

## 排序逻辑

### 优先级规则
1. **有纯净度数据的节点优先**
   - 按纯净度分数从高到低排序 (100分最高)
   - 分数相同时,按延迟从低到高排序

2. **无纯净度数据的节点**
   - 可用节点按延迟排序
   - 不可用节点按名称排序

### 排序顺序示例
```
1. 纯净度100分, 延迟50ms
2. 纯净度100分, 延迟80ms
3. 纯净度95分, 延迟30ms
4. 纯净度90分, 延迟100ms
5. 无纯净度数据, 可用, 延迟40ms
6. 无纯净度数据, 可用, 延迟60ms
7. 无纯净度数据, 不可用
```

## 使用场景

- **需要高质量IP**: 选择"按纯净度"排序,优先使用纯净度高的节点
- **需要低延迟**: 选择"按延迟"排序,优先使用延迟低的节点
- **查找特定国家**: 选择"按国家"排序,方便查找特定地区节点
- **按字母顺序**: 选择"按名称"排序,方便查找特定名称节点

## 访问测试

访问 https://home.liukun.com:8443/Projects/NodeLocalChecker/ 测试新功能:

1. 导入节点
2. 批量检测(包含IP纯净度检测)
3. 在排序下拉框中选择"按纯净度 (高→低)"
4. 观察节点列表按纯净度分数排序

## 技术细节

- **数据来源**: `ip_purity_score` 字段 (0-100分)
- **默认值**: 未检测的节点分数为-1,排在最后
- **次要排序**: 分数相同时按延迟排序,确保结果稳定
- **兼容性**: 兼容旧数据(无纯净度字段的节点)

## 文件权限

已设置为664 (rw-rw-r--)

## 相关文档

- IP纯净度检测: `docs/NodeLocalChecker_IP纯净度检测完成_2026-02-05.md`
- 界面优化: `docs/NodeLocalChecker_界面优化完成_2026-02-05.md`
- 完整功能: `docs/NodeLocalChecker_完整功能总结_2026-02-05.md`
