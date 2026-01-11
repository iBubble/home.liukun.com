# Stats页面问题修复完成

**修复时间**: 2026-01-09 20:10

## 问题原因

### 1. System Status显示Error
- **原因**: 初始状态未设置，只在API失败时才更新
- **修复**: 在updateUI函数开始时主动设置为"Online"

### 2. CPU和Network图表无数据
- **根本原因**: API返回的CPU使用率和网络速率都是0
- **技术原因**: 
  - PHP的静态变量在每次HTTP请求时都会重置
  - CPU使用率和网络速率需要两次采样才能计算差值
  - 第一次调用时没有历史数据，只能返回0

## 修复方案

### API层面修复

#### 1. CPU使用率计算
**修改前**: 使用static变量存储上次数据
```php
static $lastStat = null;
static $lastTime = null;
```

**修改后**: 使用文件存储上次数据
```php
$statFile = '/tmp/cpu_stat_last.json';
// 读取上次数据
$lastStat = json_decode(file_get_contents($statFile), true);
// 保存当前数据
file_put_contents($statFile, json_encode($currentStat));
```

#### 2. 网络速率计算
**修改前**: 使用static变量存储上次数据
```php
static $lastStats = null;
```

**修改后**: 使用文件存储上次数据
```php
$statFile = '/tmp/network_stat_last.json';
// 读取上次数据
$lastStat = json_decode(file_get_contents($statFile), true);
// 保存当前数据
file_put_contents($statFile, json_encode($currentStat));
```

### 前端层面优化

#### 1. 添加图表初始化
- 在页面加载时创建5个初始数据点（值为0）
- 确保图表有数据可以渲染，不会显示空白
- 当真实数据到来时，自动清除占位数据

#### 2. 改进图表配置
- 为CPU和内存图表设置固定Y轴范围（0-100）
- 为网络图表使用独立配置（自动范围）
- 启用图表更新动画

#### 3. 增强调试信息
- 添加详细的中文日志
- 显示每个图表的数据点数量
- 记录数据更新过程

## 测试结果

### API测试
```bash
第一次调用: CPU: 0% | 网络: 0 KB/s (建立基准)
第二次调用: CPU: 8.83% | 网络: ↓31.16 ↑53.53 KB/s ✅
第三次调用: CPU: 5.63% | 网络: ↓37.68 ↑102.77 KB/s ✅
```

### 前端测试
- ✅ System Status显示"Online"
- ✅ CPU图表显示实时使用率（5-10%）
- ✅ 内存图表显示使用率（约50%）
- ✅ 网络图表显示上传/下载速率
- ✅ 磁盘图表显示使用率（约19%）
- ✅ 所有图表每5秒自动更新

## 文件修改清单

### 1. api/server-stats.php
- 修改getCpuUsageFromProc()函数，使用文件存储历史数据
- 修改getNetworkInfo()函数，使用文件存储历史数据
- 添加错误处理，防止文件读取失败

### 2. stats.html (v4)
- 添加initCharts()函数
- 修改updateUI()函数，主动设置System Status
- 修改updateCharts()函数，添加占位数据清除逻辑
- 优化图表配置，设置合理的Y轴范围
- 增强调试日志输出

## 使用说明

### 首次访问
1. 页面加载时会显示初始占位数据（全为0）
2. 5秒后第一次API调用，建立基准数据
3. 再过5秒第二次调用，开始显示真实数据
4. 之后每5秒更新一次

### 数据说明
- **CPU使用率**: 实时计算，范围0-100%
- **内存使用率**: 实时读取，范围0-100%
- **网络速率**: 实时计算，单位KB/s
- **磁盘使用率**: 实时读取，显示百分比

### 缓存文件
API使用以下临时文件：
- `/tmp/server_stats_cache.json` - API响应缓存（3秒）
- `/tmp/cpu_stat_last.json` - CPU统计历史数据
- `/tmp/network_stat_last.json` - 网络统计历史数据

## 访问地址

- **Stats页面**: https://home.liukun.com/stats.html
- **API接口**: https://home.liukun.com/api/server-stats.php

## 后续优化建议

1. 添加更多监控指标（磁盘I/O、进程详情等）
2. 添加数据导出功能（CSV/JSON）
3. 添加告警阈值设置
4. 添加历史数据存储和趋势分析
5. 优化移动端显示效果
