# Clash 代理使用完整指南

## 📋 目录
1. [基本概念](#基本概念)
2. [项目中的Clash使用场景](#项目中的clash使用场景)
3. [配置文件结构](#配置文件结构)
4. [启动和停止](#启动和停止)
5. [代理访问方法](#代理访问方法)
6. [常见问题](#常见问题)

---

## 基本概念

### Clash是什么？
Clash是一个跨平台的代理工具，支持多种协议（VMess、VLESS、Trojan、Shadowsocks等），可以将这些节点转换为本地HTTP/SOCKS5代理。

### 工作原理
```
应用程序 → HTTP/SOCKS5代理(127.0.0.1:7890) → Clash → 代理节点 → 目标网站
```

---

## 项目中的Clash使用场景

### 1. 节点验证（app.js）
**用途**: 验证节点是否可用
**端口**: 7890 (HTTP), 7891 (SOCKS5)
**配置**: `clash_bin/config.yaml`

```javascript
// 启动Clash
await startClash();

// 通过External Controller API验证节点
const result = await testProxyViaClash(proxyName);

// 停止Clash
stopClash();
```

### 2. 抓取代理（app.js - selectProxyPool）
**用途**: 访问需要代理的网站（如Linux.do）
**端口**: 7891 (HTTP), 7892 (SOCKS5)
**配置**: `clash_bin/fetch_proxy_config.yaml`

```javascript
// 选择代理池
globalProxyPool = await selectProxyPool();

// 启动抓取代理
await startFetchProxy(0);

// 使用代理访问
const data = await fetchWithProxy(url, { cookie });

// 停止代理
stopFetchProxy();
```

### 3. 付费节点代理（premium_proxy_manager.js）
**用途**: 长期运行的代理服务
**端口**: 7940 (HTTP), 7941 (SOCKS5)
**配置**: `premium_nodes/clash_config.yaml`

```javascript
const premiumProxy = getPremiumProxyManager();

// 启动
await premiumProxy.start();

// 获取配置
const config = premiumProxy.getProxyConfig();
// { host: '127.0.0.1', port: 7940 }

// 停止
await premiumProxy.stop();
```

### 4. 浏览器代理（VNC + Chrome）
**用途**: 在服务器上通过浏览器获取Cookie
**端口**: 7940 (HTTP)
**配置**: `clash_data/browser_proxy.yaml`

```bash
# 启动浏览器代理
bash start_browser_proxy.sh

# 在Chrome中设置代理: 127.0.0.1:7940
# 访问linux.do并登录
# 从开发者工具提取Cookie
```

### 5. 全网节点获取（fetch_all_nodes.js）
**用途**: 统一节点获取流程
**端口**: 7950 (HTTP), 7951 (SOCKS5)
**配置**: `clash_data/fetch_proxy_config.yaml`

```javascript
// 下载付费节点
const premiumNodes = await downloadPremiumNodes();

// 创建配置并启动
createClashConfig(premiumNodes);
await startClashProxy();

// 通过代理获取各来源节点
const linuxdoNodes = await fetchLinuxdoNodes();

// 停止代理
stopClashProxy();
```

---

## 配置文件结构

### 基本配置模板
```yaml
# 端口配置
port: 7890              # HTTP代理端口
socks-port: 7891        # SOCKS5代理端口
allow-lan: false        # 不允许局域网访问
mode: rule              # 模式: rule/global/direct
log-level: info         # 日志级别

# 节点列表
proxies:
  - name: "节点1"
    type: vmess
    server: example.com
    port: 443
    uuid: xxx
    alterId: 0
    cipher: auto
    tls: true

# 代理组
proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - 节点1

# 规则
rules:
  - MATCH,PROXY
```

### 关键配置项说明

#### 1. 端口配置
```yaml
port: 7890              # HTTP代理端口
socks-port: 7891        # SOCKS5代理端口
```

#### 2. 模式选择
```yaml
mode: rule              # 规则模式（推荐）
mode: global            # 全局代理
mode: direct            # 直连
```

#### 3. External Controller（用于API控制）
```yaml
external-controller: 127.0.0.1:9090
secret: ""              # API密钥（可选）
```

#### 4. 节点配置优化
```yaml
proxies:
  - name: "节点名"
    type: vmess
    # ... 其他配置 ...
    tfo: false           # 🔥 禁用TCP Fast Open（提高兼容性）
    skip-cert-verify: true  # 跳过证书验证
    udp: true            # 启用UDP
```

---

## 启动和停止

### 方法1: 命令行直接启动
```bash
# 启动Clash
/path/to/clash -d /config/dir -f /path/to/config.yaml

# 后台运行
nohup /path/to/clash -d /config/dir -f /path/to/config.yaml > clash.log 2>&1 &

# 停止
pkill -f "clash.*config.yaml"
```

### 方法2: Node.js spawn（项目中使用）
```javascript
const { spawn } = require('child_process');

// 启动
const clashProcess = spawn(CLASH_BIN, [
    '-d', CLASH_DIR,
    '-f', configPath
], {
    stdio: 'pipe',
    env: { 
        ...process.env, 
        HTTP_PROXY: '',      // 清除环境变量
        HTTPS_PROXY: '',
        http_proxy: '',
        https_proxy: ''
    }
});

// 等待启动
await new Promise(r => setTimeout(r, 3000));

// 停止
clashProcess.kill('SIGTERM');
```

### 方法3: 使用管理脚本
```bash
# 启动浏览器代理
bash start_browser_proxy.sh

# 查看进程
ps aux | grep clash

# 停止所有Clash进程
pkill clash
```

---

## 代理访问方法

### 方法1: curl命令（推荐）
```bash
# HTTP代理
curl -x http://127.0.0.1:7890 https://example.com

# SOCKS5代理
curl -x socks5://127.0.0.1:7891 https://example.com

# 带Cookie
curl -x http://127.0.0.1:7890 \
     -H "Cookie: _t=xxx; _forum_session=yyy" \
     https://linux.do/t/topic/123.json
```

### 方法2: Node.js spawn curl（项目中使用）
```javascript
const { spawn } = require('child_process');

function fetchWithProxy(url, options = {}) {
    return new Promise((resolve, reject) => {
        const curlArgs = [
            '-s', '-L',
            '--max-time', '30',
            '-k',  // 跳过SSL验证
            '-x', `http://127.0.0.1:7890`,  // 代理
            '-H', 'User-Agent: Mozilla/5.0'
        ];
        
        if (options.cookie) {
            curlArgs.push('-H', `Cookie: ${options.cookie}`);
        }
        
        curlArgs.push(url);
        
        const child = spawn('curl', curlArgs, { 
            stdio: 'pipe',
            env: { 
                HTTP_PROXY: '', 
                HTTPS_PROXY: '',
                http_proxy: '',
                https_proxy: ''
            }
        });
        
        let data = '';
        child.stdout.on('data', chunk => data += chunk);
        child.on('close', (code) => {
            if (code === 0) resolve(data);
            else reject(new Error(`curl failed: ${code}`));
        });
    });
}
```

### 方法3: Node.js http/https模块
```javascript
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

const agent = new HttpsProxyAgent('http://127.0.0.1:7890');

https.get('https://example.com', { agent }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
```

### 方法4: 浏览器设置（Chrome）
```
设置 → 系统 → 打开代理设置
HTTP代理: 127.0.0.1
端口: 7890
```

---

## 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :7890
netstat -tulpn | grep 7890

# 杀死占用进程
kill -9 <PID>

# 或使用不同端口
port: 7895
```

### 2. Clash启动失败
**检查配置文件**:
```bash
# 验证YAML语法
cat config.yaml | python3 -c "import yaml, sys; yaml.safe_load(sys.stdin)"

# 查看Clash日志
tail -f clash.log
```

**常见错误**:
- 配置文件格式错误（缩进、语法）
- 节点配置不完整（缺少必要字段）
- 端口冲突

### 3. 代理无法连接
**检查Clash是否运行**:
```bash
ps aux | grep clash
curl -x http://127.0.0.1:7890 http://www.google.com
```

**检查节点是否可用**:
```bash
# 通过External Controller API测试
curl http://127.0.0.1:9090/proxies
```

### 4. 环境变量干扰
```bash
# 清除代理环境变量
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy

# 或在代码中清除
env: { 
    ...process.env, 
    HTTP_PROXY: '', 
    HTTPS_PROXY: '',
    http_proxy: '',
    https_proxy: ''
}
```

### 5. Cookie失效问题
**原因**: Cloudflare IP绑定
**解决**: 
1. 在服务器上通过VNC + Chrome + Clash代理登录
2. 从同一代理IP提取Cookie
3. 后续访问使用同一代理

### 6. 节点验证超时
**优化配置**:
```yaml
proxies:
  - name: "节点"
    # ... 其他配置 ...
    tfo: false              # 禁用TFO
    skip-cert-verify: true  # 跳过证书验证
```

**增加超时时间**:
```javascript
const timeout = 10000; // 10秒
```

---

## 项目中的端口分配

| 用途 | HTTP端口 | SOCKS5端口 | 配置文件 |
|------|---------|-----------|---------|
| 节点验证 | 7890 | 7891 | `clash_bin/config.yaml` |
| 抓取代理 | 7891 | 7892 | `clash_bin/fetch_proxy_config.yaml` |
| 付费代理 | 7940 | 7941 | `premium_nodes/clash_config.yaml` |
| 浏览器代理 | 7940 | - | `clash_data/browser_proxy.yaml` |
| 全网获取 | 7950 | 7951 | `clash_data/fetch_proxy_config.yaml` |

---

## 最佳实践

### 1. 进程管理
- 使用独立的配置文件和端口
- 及时停止不用的Clash进程
- 避免多个Clash实例冲突

### 2. 配置优化
- 禁用TFO提高兼容性
- 跳过证书验证（测试环境）
- 合理设置超时时间

### 3. 错误处理
- 捕获Clash启动失败
- 处理代理连接超时
- 实现自动重试机制

### 4. 资源清理
- 任务完成后停止Clash
- 清理临时配置文件
- 释放端口资源

---

## 相关文档

- `VNC_CHROME_PROXY_GUIDE.md` - VNC + Chrome + Clash获取Cookie
- `PREMIUM_SUBSCRIPTION_GUIDE.md` - 付费订阅配置
- `FETCH_ALL_NODES_GUIDE.md` - 全网节点获取
- `premium_proxy_manager.js` - 付费代理管理器
- `fetch_all_nodes.js` - 统一节点获取

---

## 总结

Clash在项目中主要用于：
1. **节点验证** - 测试节点可用性
2. **代理访问** - 访问需要代理的网站
3. **Cookie获取** - 通过浏览器获取登录Cookie
4. **节点获取** - 通过代理获取各来源节点

关键要点：
- 不同场景使用不同端口避免冲突
- 清除环境变量避免干扰
- 及时停止进程释放资源
- 优化配置提高成功率
