# NodeLocalChecker 设计文档

**项目名称**: NodeLocalChecker - 节点本地检测工具  
**创建日期**: 2026-02-05  
**状态**: ✅ 已完成实现

---

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   用户浏览器                         │
│  ┌──────────────────────────────────────────────┐  │
│  │  前端界面 (HTML + CSS + JavaScript)          │  │
│  │  - 节点列表展示                               │  │
│  │  - 检测控制                                   │  │
│  │  - 数据可视化                                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↕ HTTPS
┌─────────────────────────────────────────────────────┐
│                   Web服务器 (Nginx)                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  PHP API层                                    │  │
│  │  - nodes.php (节点管理)                      │  │
│  │  - check.php (检测调度)                      │  │
│  │  - parse.php (配置解析)                      │  │
│  │  - export.php (配置导出)                     │  │
│  │  - storage.php (数据存储)                    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│                   Python检测层                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  check_node_clash.py                         │  │
│  │  - Clash核心调用                             │  │
│  │  - 真实代理测试                               │  │
│  │  - 延迟测量                                   │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│                   数据存储层                         │
│  - nodes.json (节点数据)                            │
│  - update_logs (更新日志)                           │
│  - yamls (Clash配置)                                │
└─────────────────────────────────────────────────────┘
```


### 1.2 技术栈选择

**前端技术**:
- HTML5：语义化结构
- CSS3：赛博朋克风格 + 动画效果
- JavaScript ES6+：原生实现，无框架依赖
- 理由：轻量级，性能优秀，易于维护

**后端技术**:
- PHP 8.2：API接口开发
- Python 3：节点检测脚本
- 理由：服务器已有环境，开发效率高

**数据存储**:
- JSON文件：节点数据存储
- 理由：简单高效，无需数据库，易于备份

**代理核心**:
- Clash：真实代理测试
- 理由：功能强大，支持多种协议

---

## 2. 核心模块设计

### 2.1 节点导入模块

**功能**: 从多种来源导入节点配置

**输入**:
- 机场聚合器API URL
- 本地YAML文件

**处理流程**:
```
1. 接收输入（API URL或文件）
2. 下载/读取配置内容
3. 解析YAML格式
4. 提取节点信息（type, server, port, uuid/password等）
5. 生成节点哈希（去重标识）
6. 与现有节点合并
7. 保存到nodes.json
8. 返回导入结果
```

**去重算法**:
```javascript
function generateNodeHash(node) {
    let hashBase = `${node.type}_${node.server}_${node.port}`;
    
    // 根据协议类型添加唯一标识
    if (node.type === 'vless' || node.type === 'vmess') {
        hashBase += `_${node.uuid}`;
    } else if (node.type === 'trojan' || node.type === 'ss' || node.type === 'ssr') {
        hashBase += `_${node.password}`;
    } else if (node.type === 'hysteria2') {
        hashBase += `_${node.password || node.auth}`;
    }
    
    return md5(hashBase);
}
```

**输出**:
- 导入成功的节点数量
- 新增节点数量
- 重复节点数量


### 2.2 节点检测模块

**功能**: 使用Clash核心进行真实代理检测

**检测流程**:
```
1. 前端选择要检测的节点
2. 发送检测请求到check.php
3. PHP调用Python脚本check_node_clash.py
4. Python生成临时Clash配置
5. 启动Clash进程
6. 通过代理访问Google
7. 测量延迟和可用性
8. 停止Clash进程
9. 返回检测结果
10. 保存结果到nodes.json
```

**并发控制**:
- 最大并发数：10个节点
- 队列管理：使用JavaScript Promise.all
- 超时设置：30秒/节点

**检测指标**:
- available：可用性（true/false）
- latency：延迟（毫秒）
- real_ip：真实IP地址
- last_check_time：检测时间

### 2.3 IP纯净度检测模块

**功能**: 检测节点IP的质量和风险等级

**检测流程**:
```
1. 节点检测完成后，获取real_ip
2. 检查缓存（避免重复检测）
3. 调用第三方API获取IP信息
4. 解析IP类型（数据中心/住宅/移动）
5. 计算风险评分（0-100）
6. 评定纯净度等级
7. 保存结果到nodes.json
```

**评分算法**:
```javascript
function calculatePurityScore(ipInfo) {
    let score = 100;
    
    // IP类型扣分
    if (ipInfo.type === 'datacenter') score -= 30;
    if (ipInfo.type === 'hosting') score -= 40;
    
    // 风险因素扣分
    if (ipInfo.is_proxy) score -= 20;
    if (ipInfo.is_vpn) score -= 20;
    if (ipInfo.is_tor) score -= 30;
    if (ipInfo.is_crawler) score -= 10;
    
    return Math.max(0, score);
}
```

**纯净度等级**:
- 优秀：90-100分（住宅IP，无风险）
- 良好：70-89分（轻微风险）
- 一般：50-69分（中等风险）
- 较差：0-49分（高风险或数据中心IP）


### 2.4 数据持久化模块

**功能**: 将检测结果永久保存，支持自动重试

**保存流程**:
```
1. 检测完成后调用saveCheckResult()
2. 发送POST请求到nodes.php?action=update_check
3. PHP调用storage.php的updateCheckResult()
4. 读取nodes.json
5. 查找对应节点（通过node_hash）
6. 更新检测结果字段
7. 写入nodes.json
8. 返回成功/失败状态
```

**重试机制**:
```javascript
async function saveCheckResult(nodeHash, result, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch('api/nodes.php?action=update_check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ node_hash: nodeHash, result: result })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || '未知错误');
            }
            
            return true; // 保存成功
            
        } catch (error) {
            if (attempt < retries) {
                const delay = 1000 * attempt; // 递增延迟: 1s, 2s, 3s
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error(`保存失败: ${nodeHash}`);
                return false; // 最终失败
            }
        }
    }
}
```

**手动保存功能**:
```javascript
async function batchSaveCheckResults() {
    const nodesToSave = nodes.filter(node => 
        node.available !== null && 
        node.latency && 
        node.last_check_time
    );
    
    let successCount = 0;
    let failedCount = 0;
    
    for (const node of nodesToSave) {
        const saved = await saveCheckResult(node.node_hash, {
            available: node.available === 1,
            latency: node.latency,
            real_ip: node.real_ip,
            purity: node.purity
        }, 2);
        
        if (saved) successCount++;
        else failedCount++;
    }
    
    return { success: successCount, failed: failedCount };
}
```


### 2.5 界面交互模块

**功能**: 提供友好的用户界面和交互体验

**排序功能**:
```javascript
function sortNodes(sortBy) {
    switch(sortBy) {
        case 'latency':
            // 可用节点按延迟排序，不可用节点放最后
            nodes.sort((a, b) => {
                if (a.available === 1 && b.available === 1) {
                    return a.latency - b.latency;
                }
                if (a.available === 1) return -1;
                if (b.available === 1) return 1;
                if (a.available === null && b.available === 0) return -1;
                if (a.available === 0 && b.available === null) return 1;
                return 0;
            });
            break;
            
        case 'name':
            nodes.sort((a, b) => a.name.localeCompare(b.name));
            break;
            
        case 'country':
            nodes.sort((a, b) => {
                const countryA = a.country || '其他';
                const countryB = b.country || '其他';
                return countryA.localeCompare(countryB);
            });
            break;
            
        case 'purity':
            nodes.sort((a, b) => {
                // 有纯净度数据的优先，按分数从高到低
                if (a.ip_purity_score && b.ip_purity_score) {
                    if (a.ip_purity_score !== b.ip_purity_score) {
                        return b.ip_purity_score - a.ip_purity_score;
                    }
                    return a.latency - b.latency;
                }
                if (a.ip_purity_score) return -1;
                if (b.ip_purity_score) return 1;
                // 无纯净度数据的按可用性和延迟排序
                if (a.available === 1 && b.available === 1) {
                    return a.latency - b.latency;
                }
                if (a.available === 1) return -1;
                if (b.available === 1) return 1;
                return 0;
            });
            break;
    }
    
    renderNodes();
}
```

**国家筛选功能**:
```javascript
function updateCountryFilter() {
    const countries = {};
    
    nodes.forEach(node => {
        const country = node.country || '其他';
        countries[country] = (countries[country] || 0) + 1;
    });
    
    const sortedCountries = Object.entries(countries)
        .sort((a, b) => b[1] - a[1]);
    
    const filterHTML = `
        <option value="all">🌍 所有国家/地区 (${nodes.length})</option>
        ${sortedCountries.map(([country, count]) => 
            `<option value="${country}">${country} (${count})</option>`
        ).join('')}
    `;
    
    document.getElementById('countryFilter').innerHTML = filterHTML;
}
```

**自动刷新功能**:
```javascript
let autoRefreshTimer = null;

function startAutoRefresh() {
    if (autoRefreshTimer) return;
    
    autoRefreshTimer = setInterval(async () => {
        const response = await fetch('api/nodes.php?action=list');
        const data = await response.json();
        
        if (data.success && data.nodes.length !== nodes.length) {
            nodes = data.nodes;
            renderNodes();
            updateStats();
            showNotification('节点列表已更新', 'success');
        }
    }, 30000); // 30秒检查一次
}

function stopAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
}
```


---

## 3. 数据模型设计

### 3.1 节点数据结构

```json
{
  "node_hash": "md5(type_server_port_uuid/password)",
  "type": "vless|vmess|trojan|ss|ssr|hysteria2",
  "name": "节点名称",
  "server": "服务器地址",
  "port": 443,
  "uuid": "UUID（vless/vmess）",
  "password": "密码（trojan/ss/ssr）",
  "network": "传输协议（tcp/ws/grpc等）",
  "tls": true,
  "sni": "SNI域名",
  "country": "国家/地区",
  "available": 1,
  "latency": 123,
  "real_ip": "1.2.3.4",
  "ip_type": "datacenter|residential|mobile",
  "ip_purity_score": 85,
  "purity": "优秀|良好|一般|较差",
  "last_check_time": "2026-02-05 12:00:00",
  "created_at": "2026-02-05 10:00:00",
  "updated_at": "2026-02-05 12:00:00"
}
```

### 3.2 存储文件结构

```
Projects/NodeLocalChecker/
├── data/
│   └── nodes.json              # 节点数据（JSON数组）
├── logs/
│   ├── update_2026-02-05.log   # 更新日志
│   └── error.log               # 错误日志
└── yamls/
    └── config_clash_*.yaml     # 临时Clash配置
```

---

## 4. API接口设计

### 4.1 节点管理API

**端点**: `api/nodes.php`

**操作列表**:

1. **获取节点列表**
   - 方法：GET
   - 参数：`action=list`
   - 返回：`{ success: true, nodes: [...] }`

2. **更新检测结果**
   - 方法：POST
   - 参数：`action=update_check`
   - 请求体：`{ node_hash: "...", result: {...} }`
   - 返回：`{ success: true, message: "..." }`

3. **删除节点**
   - 方法：POST
   - 参数：`action=delete`
   - 请求体：`{ node_hash: "..." }`
   - 返回：`{ success: true }`

### 4.2 检测API

**端点**: `api/check.php`

**操作**:
- 方法：POST
- 请求体：`{ node: {...} }`
- 返回：`{ success: true, result: {...} }`

### 4.3 解析API

**端点**: `api/parse.php`

**操作**:
- 方法：POST
- 请求体：`{ yaml_content: "..." }`
- 返回：`{ success: true, nodes: [...] }`

### 4.4 导出API

**端点**: `api/export.php`

**操作**:
- 方法：POST
- 请求体：`{ nodes: [...] }`
- 返回：YAML文件下载

---

## 5. 安全设计

### 5.1 输入验证
- 所有用户输入进行验证和过滤
- 防止XSS攻击：HTML实体转义
- 防止路径遍历：文件路径验证

### 5.2 文件权限
- 目录权限：775 (drwxrwxr-x)
- 文件权限：664 (rw-rw-r--)
- 用户：gemini
- 用户组：www

### 5.3 HTTPS加密
- 所有通信使用HTTPS
- 域名：home.liukun.com:8443
- SSL证书：Let's Encrypt

---

## 6. 性能优化

### 6.1 前端优化
- 虚拟滚动（未来优化）
- 节流和防抖
- CSS动画使用GPU加速
- 最小化DOM操作

### 6.2 后端优化
- JSON文件缓存
- 并发检测控制
- 智能缓存（IP纯净度）
- 日志文件轮转

### 6.3 网络优化
- 使用国内镜像源
- 压缩传输数据
- 减少HTTP请求

---

## 7. 错误处理

### 7.1 前端错误处理
```javascript
try {
    // 业务逻辑
} catch (error) {
    console.error('错误:', error);
    showNotification('操作失败: ' + error.message, 'error');
}
```

### 7.2 后端错误处理
```php
try {
    // 业务逻辑
} catch (Exception $e) {
    error_log($e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
```

### 7.3 Python错误处理
```python
try:
    # 检测逻辑
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e)
    }))
    sys.exit(1)
```

---

## 8. 测试策略

### 8.1 单元测试
- 去重算法测试
- 排序算法测试
- 评分算法测试

### 8.2 集成测试
- API接口测试
- 数据持久化测试
- 检测流程测试

### 8.3 性能测试
- 大量节点渲染测试
- 并发检测压力测试
- 内存泄漏测试

### 8.4 兼容性测试
- 多浏览器测试
- 移动端测试
- 不同分辨率测试

---

## 9. 部署方案

### 9.1 部署环境
- 服务器：Ubuntu 24.04.3 LTS
- Web服务器：Nginx + 宝塔面板
- PHP版本：8.2
- Python版本：3.x
- 域名：home.liukun.com:8443

### 9.2 部署步骤
1. 上传代码到服务器
2. 设置文件权限（775/664）
3. 安装Clash核心
4. 配置Cron定时任务
5. 测试功能
6. 正式上线

### 9.3 监控和维护
- 日志监控
- 错误告警
- 定期备份
- 性能监控

---

## 10. 文档和注释

### 10.1 代码注释规范
- 所有函数添加中文注释
- 复杂逻辑添加行内注释
- API接口添加文档注释

### 10.2 文档体系
- 需求文档（requirements.md）
- 设计文档（design.md）
- 任务文档（tasks.md）
- 用户手册（README.md）
- 开发日志（docs/）

---

**文档版本**: 1.0  
**最后更新**: 2026-02-05  
**状态**: ✅ 设计已全部实现
