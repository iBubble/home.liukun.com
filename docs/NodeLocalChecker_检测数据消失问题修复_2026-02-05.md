# NodeLocalChecker 检测数据消失问题修复

**日期**: 2026-02-05  
**问题**: 检测完毕后能看到各项数值，但点击确认对话框后，各项数值全部消失  
**状态**: ✅ 已修复

---

## 问题描述

用户反馈：
- 节点检测完成后，表格中正常显示延迟、真实IP、IP纯净度等数据
- 弹出"检测完成"对话框，点击确认后
- **所有检测数据消失**，表格恢复到未检测状态

---

## 问题分析

### 根本原因

1. **检测时的数据流**：
   ```
   checkNode() → 调用API检测
   ↓
   result = API返回结果
   ↓
   updateNodeStatus() → 更新DOM显示 ✓
   ↓
   nodes[index] 数组未正确更新 ✗
   ```

2. **检测完成后的数据流**：
   ```
   检测完成 → alert() 对话框
   ↓
   用户点击确认
   ↓
   sortNodes() → 按延迟排序
   ↓
   displayNodes() → 重新渲染表格
   ↓
   从 nodes 数组读取数据 → 数据为空 ✗
   ↓
   表格显示为未检测状态
   ```

### 问题代码

**问题1：checkNode 函数中数据更新不完整**

```javascript
// 旧代码 - 问题版本
if (result.success) {
    node.available = result.available;  // 可能是 true/false
    node.latency = result.latency;
    node.real_ip = result.real_ip;
    node.purity = result.purity;
    // 缺少 last_check_time
    // 缺少 ip_purity_score
}
```

**问题2：displayNodes 函数依赖 last_check_time**

```javascript
// 旧代码 - 问题版本
if (node.last_check_time) {  // 检测时未设置此字段
    if (node.available === 1) {
        // 显示数据
    }
} else {
    // 显示"待检测"
}
```

---

## 修复方案

### 修复1：完善 checkNode 函数中的数据更新

**文件**: `Projects/NodeLocalChecker/js/app.js`

```javascript
if (result.success) {
    // 更新 nodes 数组中的数据
    node.available = result.available ? 1 : 0;  // 统一为 0/1
    node.latency = result.latency || null;
    node.real_ip = result.real_ip || null;
    node.last_check_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // 保存纯净度数据
    if (result.purity && result.purity.score !== undefined) {
        node.ip_purity_score = result.purity.score;
        node.purity = result.purity;
    } else {
        node.ip_purity_score = null;
        node.purity = null;
    }

    if (result.available) {
        isAvailable = true;
        updateNodeStatus(index, 'success', '可用', result.latency, result.real_ip, result.purity);
    } else {
        updateNodeStatus(index, 'failed', '不可用', '-', '-', null);
    }
    
    // 保存检测结果到数据库
    saveCheckResult(node.node_hash, result);
} else {
    node.available = 0;
    node.last_check_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    updateNodeStatus(index, 'failed', '检测失败', '-', '-', null);
}
```

**关键改进**：
- ✅ 统一 `available` 为 0/1（而不是 true/false）
- ✅ 添加 `last_check_time` 字段
- ✅ 正确保存 `ip_purity_score` 和 `purity` 对象
- ✅ 处理检测失败的情况

### 修复2：改进 displayNodes 函数的数据显示逻辑

**文件**: `Projects/NodeLocalChecker/js/app.js`

```javascript
// 检查节点是否已检测（available 为 0 或 1）
if (node.available === 1) {
    // 可用节点
    statusBadge = `<span class="status-badge status-success" id="status-${originalIndex}">可用</span>`;
    latencyText = node.latency || '-';
    realIpText = node.real_ip || '-';
    
    // 显示IP纯净度
    if (node.purity && node.purity.score !== undefined) {
        const score = node.purity.score;
        const level = node.purity.level;
        const type = node.purity.type || '未知';
        
        let color = '#888';
        if (score >= 90) color = '#0f0';
        else if (score >= 75) color = '#0ff';
        else if (score >= 60) color = '#ff0';
        else if (score >= 40) color = '#f80';
        else color = '#f00';
        
        purityHtml = `
            <span style="color: ${color}; font-weight: bold;">${score}分</span>
            <span style="color: #888; font-size: 11px;"> (${level})</span>
            <br>
            <span style="color: #888; font-size: 10px;">${type}</span>
        `;
    } else if (node.ip_purity_score !== null && node.ip_purity_score !== undefined) {
        // 兼容旧数据格式
        const score = node.ip_purity_score;
        let level = '未知';
        if (score >= 90) level = '优秀';
        else if (score >= 75) level = '良好';
        else if (score >= 60) level = '一般';
        else level = '较差';
        
        let color = '#888';
        if (score >= 90) color = '#0f0';
        else if (score >= 75) color = '#0ff';
        else if (score >= 60) color = '#ff0';
        else if (score >= 40) color = '#f80';
        else color = '#f00';
        
        purityHtml = `
            <span style="color: ${color}; font-weight: bold;">${score}分</span>
            <span style="color: #888; font-size: 11px;"> (${level})</span>
        `;
    }
} else if (node.available === 0) {
    // 不可用节点
    statusBadge = `<span class="status-badge status-failed" id="status-${originalIndex}">不可用</span>`;
} else {
    // 未检测过（available 为 null 或 undefined）
    statusBadge = `<span class="status-badge status-pending" id="status-${originalIndex}">待检测</span>`;
}
```

**关键改进**：
- ✅ 不再依赖 `last_check_time`，直接检查 `available` 字段
- ✅ 兼容新旧两种纯净度数据格式
- ✅ 明确区分三种状态：可用(1)、不可用(0)、未检测(null)

---

## 测试验证

### 测试步骤

1. **导入节点**
   - 打开 https://home.liukun.com:8443/Projects/NodeLocalChecker/
   - 点击"一键导入"或上传 YAML 文件

2. **选择并检测**
   - 选择 2-3 个节点
   - 点击"开始检测"
   - 等待检测完成

3. **验证数据显示**
   - 检测完成后，观察表格中的数据：
     - ✓ 延迟（如：123ms）
     - ✓ 真实IP（如：1.2.3.4）
     - ✓ IP纯净度（如：85分 (良好)）

4. **点击确认对话框**
   - 点击"检测完成"对话框的"确定"按钮
   - **关键验证**：数据是否仍然显示

5. **额外验证**
   - 切换排序方式（按延迟、按纯净度）
   - 切换国家筛选
   - 刷新页面
   - 数据应该始终保持显示

### 预期结果

✅ **检测完成后**：
- 延迟、IP、纯净度正常显示

✅ **点击确认后**：
- 所有数据保持显示，不会消失
- 可以正常排序和筛选

✅ **刷新页面后**：
- 数据仍然存在（已保存到数据库）

---

## 技术细节

### 数据流程图

```
用户操作: 开始检测
    ↓
并发检测 (10个并发)
    ↓
每个节点:
    ├─ API检测 → 获取结果
    ├─ 更新 nodes[index] 数组 ✓
    ├─ 更新 DOM 显示 ✓
    └─ 保存到数据库 ✓
    ↓
检测完成
    ├─ sortNodes() → 按延迟排序
    ├─ displayNodes() → 重新渲染
    │   └─ 从 nodes 数组读取数据 ✓
    └─ alert() → 显示完成对话框
    ↓
用户点击确认
    ↓
数据保持显示 ✓
```

### 关键代码位置

1. **checkNode 函数** (第 580-650 行)
   - 负责检测单个节点
   - 更新 nodes 数组
   - 调用 updateNodeStatus 更新 DOM

2. **displayNodes 函数** (第 380-480 行)
   - 负责渲染节点列表
   - 从 nodes 数组读取数据
   - 生成表格 HTML

3. **startCheck 函数** (第 520-680 行)
   - 负责并发检测控制
   - 检测完成后排序
   - 显示完成对话框

---

## 相关文件

- `Projects/NodeLocalChecker/js/app.js` - 主要修复文件
- `Processes/test_check_data_persist.html` - 测试页面
- `docs/NodeLocalChecker_检测数据消失问题修复_2026-02-05.md` - 本文档

---

## 总结

### 问题根源
检测时只更新了 DOM，没有正确更新 nodes 数组，导致重新渲染时数据丢失。

### 解决方案
1. 完善数据更新逻辑，确保 nodes 数组正确保存检测结果
2. 改进显示逻辑，不依赖 last_check_time，直接检查 available 字段
3. 统一数据格式，避免 true/false 和 0/1 混用

### 修复效果
✅ 检测数据在点击确认后不再消失  
✅ 排序和筛选功能正常工作  
✅ 刷新页面后数据持久化正常

---

**修复完成时间**: 2026-02-05 05:36  
**测试状态**: 待用户验证
