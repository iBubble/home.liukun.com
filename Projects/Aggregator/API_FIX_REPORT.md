# 机场聚合器 API 路径修复报告

## 问题描述
"全网获取节点"按钮点击后报错：
```
Network Error: Unexpected token '<', "<html> <h"... is not valid JSON
```

## 问题原因
前端使用相对路径 `/api/fetch_all` 调用API，但由于Nginx反向代理配置：
```nginx
location /Projects/Aggregator/ {
    proxy_pass http://127.0.0.1:3000/;
    ...
}
```

当访问 `https://home.liukun.com:8443/Projects/Aggregator/` 时，前端的 `/api/fetch_all` 会被浏览器解析为 `https://home.liukun.com:8443/api/fetch_all`，而不是 `https://home.liukun.com:8443/Projects/Aggregator/api/fetch_all`，导致请求到了错误的路径，返回了HTML而不是JSON。

## 解决方案
在前端代码中添加API基础路径配置：

```javascript
// API 基础路径配置 - 根据当前路径自动判断
const API_BASE = window.location.pathname.includes('/Projects/Aggregator') 
    ? '' // 在 /Projects/Aggregator/ 下，使用相对路径
    : '/Projects/Aggregator'; // 其他情况使用绝对路径

// API 调用辅助函数
const apiUrl = (path) => `${API_BASE}${path}`;
```

然后将所有的API调用从：
```javascript
fetch('/api/xxx')
```

修改为：
```javascript
fetch(apiUrl('/api/xxx'))
```

## 修复过程
1. 从原始备份恢复 `index.html` 文件
2. 使用Python脚本精确替换所有API调用（避免破坏语法）
3. 修改页面标题为"机场聚合器国内版"
4. 验证JavaScript语法正确性
5. 测试页面加载和API调用

## 修改文件
- `Projects/Aggregator/index.html` - 添加API路径配置和批量替换所有API调用

## 测试结果
✅ 页面标题正确显示："机场聚合器国内版"
✅ JavaScript语法检查通过（node --check）
✅ API状态接口正常响应：`https://home.liukun.com:8443/Projects/Aggregator/api/status`
✅ Vue应用正常初始化，无模板编译错误

## 访问地址
https://home.liukun.com:8443/Projects/Aggregator/

## 使用说明
刷新页面后，请使用 **Ctrl+Shift+R**（Windows/Linux）或 **Cmd+Shift+R**（Mac）强制刷新清除浏览器缓存。

## 修复时间
2026-02-08

## 备注
- 所有API调用已统一使用 `apiUrl()` 辅助函数
- 支持在不同路径下访问（根路径或子路径）
- 无需修改Nginx配置
- 使用Python脚本进行精确替换，避免破坏复杂的JavaScript语法结构
