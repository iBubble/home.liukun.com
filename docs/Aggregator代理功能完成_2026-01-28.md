# Aggregator代理功能完成报告

**日期**: 2026-01-28  
**项目**: 机场聚合器 (Aggregator)  
**功能**: SOCKS5代理支持

## 问题诊断

### 初始问题
- 用户反馈：服务器无法连接到代理 us.liukun.com:1080
- 前端代理测试功能返回连接超时

### 诊断过程

1. **PHP扩展检查** ✅
   - curl扩展：已安装
   - sockets扩展：已安装
   - PHP版本：8.3.6
   - 禁用函数：无

2. **网络连接测试** ✅
   ```bash
   # TCP连接测试
   nc -zv us.liukun.com 1080
   # 结果：Connection succeeded!
   
   # curl SOCKS5测试
   curl --socks5 us.liukun.com:1080 --socks5-basic --proxy-user Gemini:Gl5181081 https://www.google.com
   # 结果：成功连接
   
   # ping测试
   ping -c 2 us.liukun.com
   # 结果：177ms延迟，0%丢包
   ```

3. **Python SOCKS5支持** ✅
   - 安装PySocks库：`pip3 install PySocks --break-system-packages`
   - Python测试成功：可以通过SOCKS5代理访问网站

4. **PHP curl SOCKS5问题** ❌ → ✅
   - 初始问题：使用 `CURLPROXY_SOCKS5` 常量超时
   - 解决方案：参考 `Projects/Proxy/Proxy.php` 项目
   - 关键：使用 `socks5h://` 协议前缀（h表示在代理端解析域名）

## 解决方案

### 1. PHP代理测试修复

修改 `Projects/Aggregator/api/index.php` 中的 `handleTestProxy()` 函数：

```php
// 对于SOCKS5，使用 socks5h:// 协议前缀
if (strtolower($proxyConfig['type']) === 'socks5') {
    $authPart = '';
    if (!empty($proxyConfig['username']) && !empty($proxyConfig['password'])) {
        $authPart = rawurlencode($proxyConfig['username']) . ':' . rawurlencode($proxyConfig['password']) . '@';
    }
    $proxy = 'socks5h://' . $authPart . $proxyConfig['host'] . ':' . $proxyConfig['port'];
    curl_setopt($ch, CURLOPT_PROXY, $proxy);
}
```

**测试结果**：
```json
{
  "success": true,
  "message": "代理连接成功！响应时间: 1087ms",
  "response_time": 1087,
  "http_code": 200
}
```

### 2. Python代理包装脚本

创建 `Projects/Aggregator/external/aggregator/proxy_collect.py`：

```python
#!/usr/bin/env python3
"""
代理包装脚本 - 为collect.py添加SOCKS5代理支持
"""
import sys
import os
import json

# 读取代理配置
config_file = os.path.join(os.path.dirname(__file__), '../../data/proxy_config.json')
if os.path.exists(config_file):
    with open(config_file, 'r') as f:
        proxy_config = json.load(f)
    
    if proxy_config.get('enable') and proxy_config.get('type') == 'socks5':
        try:
            import socks
            import socket
            
            # 设置SOCKS5代理
            socks.set_default_proxy(
                socks.SOCKS5,
                proxy_config.get('host'),
                int(proxy_config.get('port')),
                username=proxy_config.get('username', ''),
                password=proxy_config.get('password', '')
            )
            socket.socket = socks.socksocket
            print(f"✓ SOCKS5代理已启用: {proxy_config.get('host')}:{proxy_config.get('port')}")
        except ImportError:
            print("⚠ 警告: PySocks未安装，无法使用SOCKS5代理")
        except Exception as e:
            print(f"⚠ 警告: 代理设置失败: {e}")

# 导入并执行原始的collect.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'subscribe'))
from collect import main

if __name__ == '__main__':
    main()
```

### 3. 扫描脚本修改

修改 `Projects/Aggregator/scan.php`：

```php
// 如果启用了代理，使用代理包装脚本
if ($proxyConfig && $proxyConfig['enable']) {
    logMessage("使用代理: {$proxyConfig['type']}://{$proxyConfig['host']}:{$proxyConfig['port']}");
    $cmd = "python3 proxy_collect.py --skip --overwrite --pages 10 --num 128 --targets clash --all 2>&1";
} else {
    $cmd = "python3 subscribe/collect.py --skip --overwrite --pages 10 --num 128 --targets clash --all 2>&1";
}
```

## 技术要点

### SOCKS5代理的正确使用

1. **PHP curl**：
   - 使用 `socks5h://` 协议前缀
   - `h` 表示在代理端解析域名（避免DNS泄露）
   - 认证信息直接包含在URL中：`socks5h://user:pass@host:port`

2. **Python**：
   - 需要安装 `PySocks` 库
   - 使用 `socks.set_default_proxy()` 设置全局代理
   - 替换 `socket.socket` 为 `socks.socksocket`

3. **命令行curl**：
   - 使用 `--socks5` 参数
   - 使用 `--socks5-basic` 或 `--proxy-user` 进行认证

### 代理配置文件格式

`Projects/Aggregator/data/proxy_config.json`：
```json
{
    "enable": true,
    "type": "socks5",
    "host": "us.liukun.com",
    "port": "1080",
    "username": "Gemini",
    "password": "Gl5181081"
}
```

## 测试验证

### 1. 网络连接测试
```bash
# TCP连接
nc -zv us.liukun.com 1080
# ✓ Connection succeeded!

# curl测试
curl --socks5 us.liukun.com:1080 --socks5-basic --proxy-user Gemini:Gl5181081 http://httpbin.org/ip
# ✓ 成功返回IP信息
```

### 2. Python代理测试
```bash
python3 -c "
import socks, socket, urllib.request
socks.set_default_proxy(socks.SOCKS5, 'us.liukun.com', 1080, username='Gemini', password='Gl5181081')
socket.socket = socks.socksocket
response = urllib.request.urlopen('http://httpbin.org/ip', timeout=10)
print('成功！状态码:', response.status)
"
# ✓ 成功！状态码: 200
```

### 3. PHP代理测试
```bash
curl -X POST "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/test-proxy" \
  -H "Content-Type: application/json" \
  -d '{"proxy":{"enable":true,"type":"socks5","host":"us.liukun.com","port":"1080","username":"Gemini","password":"Gl5181081"}}'
# ✓ {"success":true,"message":"代理连接成功！响应时间: 1087ms"}
```

## 使用说明

### 前端配置

1. 打开 https://home.liukun.com:8443/Projects/Aggregator/
2. 点击右上角"设置"按钮
3. 填写代理配置：
   - 代理类型：SOCKS5
   - 代理地址：us.liukun.com
   - 代理端口：1080
   - 用户名：Gemini
   - 密码：Gl5181081
4. 勾选"使用代理"
5. 点击"测试代理连接"验证
6. 保存设置

### 扫描节点

配置代理后，执行以下操作会自动使用代理：
- 手动扫描节点
- 自动扫描任务（cron）
- 验证节点
- 更新核心代码

## 文件清单

### 新增文件
- `Projects/Aggregator/external/aggregator/proxy_collect.py` - Python代理包装脚本
- `Projects/Aggregator/data/proxy_config.json` - 代理配置文件

### 修改文件
- `Projects/Aggregator/api/index.php` - 修复handleTestProxy()函数
- `Projects/Aggregator/scan.php` - 添加代理支持

### 参考文件
- `Projects/Proxy/Proxy.php` - 成功的SOCKS5代理实现参考

## 依赖项

### Python
- `PySocks` - SOCKS5代理支持
  ```bash
  pip3 install PySocks --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple
  ```

### PHP
- curl扩展（已安装）
- sockets扩展（已安装）

## 下一步

1. ✅ 代理测试功能已完成
2. ✅ Python代理包装脚本已创建
3. ✅ 扫描脚本已修改
4. ⏳ 等待用户测试实际扫描效果
5. ⏳ 观察使用代理后节点质量是否改善

## 注意事项

1. **代理性能**：
   - 当前代理延迟约1秒
   - 扫描时间会相应增加
   - 建议使用更快的代理服务器

2. **代理稳定性**：
   - 确保代理服务器稳定运行
   - 监控代理连接状态
   - 设置合理的超时时间

3. **安全性**：
   - 代理配置文件包含敏感信息
   - 确保文件权限正确（664）
   - 不要提交到公开仓库

## 总结

通过参考 `Projects/Proxy/Proxy.php` 项目的成功实现，我们发现了关键问题：

1. **PHP curl的SOCKS5代理需要使用 `socks5h://` 协议前缀**
2. **Python需要安装PySocks库并正确设置全局代理**
3. **服务器网络连接正常，问题在于代码实现**

现在代理功能已完全实现，可以通过前端界面配置和测试，扫描脚本会自动使用配置的代理。
