# Stats页面故障排查指南

**更新时间**: 2026-01-09 19:55

## 问题描述

1. System Status显示"Error"
2. 四个图表无数据显示

## 已完成的修复

### 1. 修复System Status显示问题
- ✅ 在updateUI函数开始时设置System Status为"Online"
- ✅ 更新状态指示器为绿色（status-online）
- ✅ 添加错误处理，API失败时才显示"Error"

### 2. 修复SSL证书选择器问题
- ✅ 将`:has()`和`:contains()`伪类选择器改为标准JavaScript方法
- ✅ 使用`textContent.includes()`进行文本匹配

### 3. 添加调试信息
- ✅ 在fetchServerStats中添加console.log
- ✅ 在updateCharts中添加数据日志
- ✅ 添加错误详细信息输出

### 4. 改进初始化逻辑
- ✅ 检查DOM加载状态
- ✅ 使用DOMContentLoaded事件确保页面完全加载
- ✅ 添加版本号注释（v2）

## 浏览器调试步骤

### 1. 清除浏览器缓存
```
Chrome/Edge: Ctrl+Shift+Delete
Firefox: Ctrl+Shift+Delete
Safari: Cmd+Option+E
```

或者使用硬刷新：
```
Chrome/Edge/Firefox: Ctrl+Shift+R 或 Ctrl+F5
Safari: Cmd+Shift+R
```

### 2. 打开开发者工具
按 `F12` 或右键点击页面选择"检查"

### 3. 查看Console标签页
应该看到以下日志：
```
DOM已加载，立即初始化...
正在获取服务器数据...
服务器数据获取成功: {system: {...}, cpu: {...}, ...}
更新图表数据: {labels: 1, cpu: [0], memory: [50.31], ...}
```

### 4. 查看Network标签页
- 找到`server-stats.php`请求
- 状态应该是`200 OK`
- Response应该是有效的JSON数据

### 5. 检查Elements标签页
- 找到`<canvas id="cpuChart">`等元素
- 确认它们存在且可见

## 常见问题

### Q1: 图表仍然无数据
**A**: 等待5秒后会自动刷新，或者手动刷新页面（Ctrl+F5）

### Q2: System Status仍显示Error
**A**: 
1. 检查API是否正常：访问 https://home.liukun.com:8443/api/server-stats.php
2. 查看浏览器Console是否有错误信息
3. 检查网络连接

### Q3: 图表显示但数据为0
**A**: 
- CPU使用率首次可能为0（需要两次采样）
- 网络速率在静止时为0是正常的
- 等待5-10秒后数据会更新

### Q4: Chart.js加载失败
**A**: 
1. 检查CDN是否可访问：https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js
2. 如果CDN被墙，可以下载到本地使用

## 测试命令

### 测试API
```bash
curl -s https://home.liukun.com:8443/api/server-stats.php | python3 -m json.tool
```

### 测试页面加载
```bash
curl -s https://home.liukun.com:8443/stats.html | grep -E "fetchServerStats|Chart.js|updateUI"
```

### 清除服务器缓存
```bash
sudo rm -f /tmp/server_stats_cache.json
```

## 访问地址

- **Stats页面**: https://home.liukun.com:8443/stats.html
- **API接口**: https://home.liukun.com:8443/api/server-stats.php
- **测试页面**: https://home.liukun.com:8443/test-stats-api.html

## 预期效果

1. **System Status**: 显示"Online"，绿色指示灯
2. **CPU图表**: 显示CPU使用率历史曲线（0-100%）
3. **内存图表**: 显示内存使用率历史曲线（约50%）
4. **网络图表**: 显示上传/下载速率柱状图（可能为0）
5. **磁盘图表**: 显示磁盘使用率饼图（约19%已用）

## 下一步

如果问题仍然存在，请：
1. 截图浏览器Console的错误信息
2. 截图Network标签页的API请求详情
3. 提供浏览器版本信息
