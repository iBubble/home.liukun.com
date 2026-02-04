# Aggregator 代理功能实现说明

## 功能概述

为解决服务器无法直接访问国外节点源的问题，添加了代理配置功能。通过配置HTTP/HTTPS/SOCKS5代理，可以大幅提高节点扫描成功率。

## 实现时间

2026-01-28

## 功能特性

### 1. 代理类型支持
- **HTTP代理**
- **HTTPS代理**
- **SOCKS5代理**

### 2. 认证支持
- 支持无认证代理
- 支持用户名/密码认证

### 3. 配置持久化
- 代理配置保存在浏览器localStorage
- 服务器端保存在 `data/proxy_config.json`

## 使用方法

### 配置代理

1. 访问 https://home.liukun.com:8443/Projects/Aggregator/
2. 点击右上角"设置"按钮
3. 在"代理设置"部分：
   - 勾选"启用代理"
   - 选择代理类型（HTTP/HTTPS/SOCKS5）
   - 填写代理地址和端口
   - （可选）填写用户名和密码
4. 点击"保存"

### 使用代理扫描

配置保存后，所有扫描任务（手动扫描和自动扫描）都会自动使用代理。

## 技术实现

### 前端实现

**文件**: `js/app.js`

1. **配置存储**
```javascript
// 构造函数中添加代理配置属性
this.proxyEnable = false;
this.proxyType = 'http';
this.proxyHost = '';
this.proxyPort = '';
this.proxyUsername = '';
this.proxyPassword = '';
```

2. **发送代理配置**
```javascript
// 在startScan()方法中
const proxyConfig = this.proxyEnable ? {
    enable: true,
    type: this.proxyType,
    host: this.proxyHost,
    port: this.proxyPort,
    username: this.proxyUsername,
    password: this.proxyPassword
} : { enable: false };

// 发送到后端
body: JSON.stringify({ proxy: proxyConfig })
```

### 后端实现

**文件**: `api/index.php`

1. **接收代理配置**
```php
$input = json_decode(file_get_contents('php://input'), true);
$proxyConfig = isset($input['proxy']) ? $input['proxy'] : ['enable' => false];
```

2. **保存配置文件**
```php
if ($proxyConfig['enable']) {
    $proxyFile = DATA_DIR . '/proxy_config.json';
    file_put_contents($proxyFile, json_encode($proxyConfig, JSON_PRETTY_PRINT));
}
```

### 扫描脚本实现

**文件**: `scan.php`

1. **读取代理配置**
```php
$proxyFile = DATA_DIR . '/proxy_config.json';
if (file_exists($proxyFile)) {
    $proxyConfig = json_decode(file_get_contents($proxyFile), true);
}
```

2. **设置环境变量**
```php
if ($proxyConfig && $proxyConfig['enable']) {
    $proxyUrl = $proxyConfig['type'] . '://';
    
    // 添加认证信息
    if (!empty($proxyConfig['username']) && !empty($proxyConfig['password'])) {
        $proxyUrl .= urlencode($proxyConfig['username']) . ':' . 
                     urlencode($proxyConfig['password']) . '@';
    }
    
    $proxyUrl .= $proxyConfig['host'] . ':' . $proxyConfig['port'];
    
    // 设置环境变量
    $envVars[] = 'HTTP_PROXY=' . escapeshellarg($proxyUrl);
    $envVars[] = 'HTTPS_PROXY=' . escapeshellarg($proxyUrl);
    $envVars[] = 'http_proxy=' . escapeshellarg($proxyUrl);
    $envVars[] = 'https_proxy=' . escapeshellarg($proxyUrl);
    
    if ($proxyConfig['type'] === 'socks5') {
        $envVars[] = 'ALL_PROXY=' . escapeshellarg($proxyUrl);
    }
}
```

## 代理环境变量

Python的requests库会自动识别以下环境变量：

- `HTTP_PROXY` / `http_proxy` - HTTP请求代理
- `HTTPS_PROXY` / `https_proxy` - HTTPS请求代理
- `ALL_PROXY` - 所有协议的代理（SOCKS5）

## 配置文件格式

**文件位置**: `Projects/Aggregator/data/proxy_config.json`

```json
{
    "enable": true,
    "type": "http",
    "host": "127.0.0.1",
    "port": "7890",
    "username": "",
    "password": ""
}
```

## 常见代理配置示例

### 1. Clash代理
```
类型: HTTP
地址: 127.0.0.1
端口: 7890
```

### 2. V2Ray代理
```
类型: SOCKS5
地址: 127.0.0.1
端口: 1080
```

### 3. 需要认证的代理
```
类型: HTTP
地址: proxy.example.com
端口: 8080
用户名: user
密码: pass
```

## 日志输出

启用代理后，日志中会显示：

```
[2026-01-28 10:00:00] 使用代理: http://127.0.0.1:7890
[2026-01-28 10:00:01] 代理配置已保存: http://127.0.0.1:7890
[2026-01-28 10:00:02] 代理环境变量已设置
```

## 测试方法

### 1. 浏览器测试
1. 打开浏览器开发者工具（F12）
2. 配置代理并保存
3. 点击"开始扫描"
4. 查看日志输出，确认代理已启用

### 2. 命令行测试
```bash
bash Processes/test_proxy_config.sh
```

## 注意事项

1. **代理服务器必须可访问**
   - 确保代理服务器正在运行
   - 确保服务器可以访问代理地址

2. **端口配置**
   - Clash默认HTTP端口: 7890
   - Clash默认SOCKS5端口: 7891
   - V2Ray默认SOCKS5端口: 1080

3. **认证信息安全**
   - 用户名和密码存储在localStorage（浏览器本地）
   - 服务器端配置文件权限为664

4. **代理性能**
   - 使用代理会增加网络延迟
   - 建议使用本地代理服务器以获得最佳性能

## 故障排查

### 问题1: 扫描仍然失败
- 检查代理服务器是否正常运行
- 检查代理地址和端口是否正确
- 查看日志确认代理是否被使用

### 问题2: 节点数量没有增加
- 代理配置正确但节点源本身可能没有节点
- 尝试等待更长时间（扫描需要10-30分钟）
- 检查日志中的错误信息

### 问题3: 代理认证失败
- 确认用户名和密码正确
- 某些代理服务器可能不支持认证

## 相关文件

- `Projects/Aggregator/index.html` - 代理设置UI
- `Projects/Aggregator/js/app.js` - 前端逻辑
- `Projects/Aggregator/api/index.php` - API接口
- `Projects/Aggregator/scan.php` - 扫描脚本
- `Projects/Aggregator/data/proxy_config.json` - 配置文件

## 更新日志

- 2026-01-28: 初始实现，支持HTTP/HTTPS/SOCKS5代理
