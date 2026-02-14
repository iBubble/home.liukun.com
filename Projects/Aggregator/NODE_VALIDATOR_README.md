# 节点验证服务说明

## 概述

节点验证服务是一个后台持续运行的服务,负责自动验证所有节点的可用性,并按质量分级保存。

## 架构设计

```
┌─────────────────────────────────────────┐
│     节点验证服务 (node-validator)        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  定时任务 (每小时)                 │ │
│  │  - 读取 proxies.json              │ │
│  │  - 逐个测试节点                   │ │
│  │  - 按质量分级                     │ │
│  │  - 保存到 validated_nodes.json   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  HTTP API (端口 3002)             │ │
│  │  - GET /status                    │ │
│  │  - GET /nodes/excellent           │ │
│  │  - GET /nodes/good                │ │
│  │  - GET /nodes/basic               │ │
│  │  - POST /validate                 │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│     validated_nodes.json                │
│                                         │
│  {                                      │
│    "excellent": [...],  // 能访问FB    │
│    "good": [...],       // 能访问Google│
│    "basic": [...],      // 能访问204   │
│    "lastUpdate": "...", │
│    "totalValid": 50     │
│  }                                      │
└─────────────────────────────────────────┘
```

## 节点质量分级

### Excellent (优质节点)
- **要求**: 能访问 Facebook + Twitter + YouTube (至少2个)
- **用途**: 
  - 访问 Linux.do
  - 访问各种外网资源
  - 作为种子节点
- **特点**: 质量最高,稳定性好

### Good (良好节点)
- **要求**: 能访问 Google + GitHub (至少1个)
- **用途**:
  - 访问 GitHub 订阅源
  - 访问 Google 服务
- **特点**: 质量较好,适合大部分场景

### Basic (基础节点)
- **要求**: 能访问 Google 204 测试页
- **用途**:
  - 基础连通性测试
  - 备用节点
- **特点**: 最低要求,可能不稳定

## 使用方法

### 1. 启动服务

```bash
./manage_validator.sh start
```

### 2. 查看状态

```bash
./manage_validator.sh api-status
```

输出示例:
```json
{
  "isValidating": false,
  "validatedNodes": {
    "excellent": 15,
    "good": 30,
    "basic": 20,
    "total": 65,
    "lastUpdate": "2026-02-08T21:40:00.000Z"
  }
}
```

### 3. 获取节点

```bash
# 获取优质节点
curl -s http://127.0.0.1:3002/nodes/excellent | python3 -m json.tool

# 获取良好节点
curl -s http://127.0.0.1:3002/nodes/good | python3 -m json.tool

# 获取所有节点
curl -s http://127.0.0.1:3002/nodes/all | python3 -m json.tool
```

### 4. 手动触发验证

```bash
./manage_validator.sh api-validate
```

### 5. 查看日志

```bash
./manage_validator.sh logs
```

## 在代码中使用

### 方法1: 读取文件

```javascript
const fs = require('fs');

// 读取已验证的节点
const validatedNodes = JSON.parse(
    fs.readFileSync('validated_nodes.json', 'utf8')
);

// 使用优质节点
const excellentNodes = validatedNodes.excellent;
console.log(`找到 ${excellentNodes.length} 个优质节点`);

// 选择延迟最低的节点
const bestNode = excellentNodes[0]; // 已按延迟排序
```

### 方法2: 调用API

```javascript
const http = require('http');

function getValidatedNodes(quality = 'excellent') {
    return new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:3002/nodes/${quality}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

// 使用
const nodes = await getValidatedNodes('excellent');
console.log(`获取到 ${nodes.length} 个优质节点`);
```

## 集成到主服务

在 `app.js` 中使用已验证的节点:

```javascript
// 选择代理节点时,优先使用已验证的节点
async function selectProxyPool() {
    try {
        // 1. 尝试读取已验证的节点
        const validatedFile = path.join(ROOT, 'validated_nodes.json');
        if (fs.existsSync(validatedFile)) {
            const validated = JSON.parse(fs.readFileSync(validatedFile, 'utf8'));
            
            // 优先使用excellent节点
            if (validated.excellent && validated.excellent.length > 0) {
                addLog(`✅ 使用 ${validated.excellent.length} 个已验证的优质节点`, 'success');
                return validated.excellent.slice(0, 5);
            }
            
            // 其次使用good节点
            if (validated.good && validated.good.length > 0) {
                addLog(`✅ 使用 ${validated.good.length} 个已验证的良好节点`, 'info');
                return validated.good.slice(0, 5);
            }
        }
        
        // 2. 降级到proxies.json
        // ... 原有逻辑
    } catch (e) {
        addLog(`读取已验证节点失败: ${e.message}`, 'warning');
    }
}
```

## 配置

在 `node_validator_service.js` 中可以调整:

```javascript
const CONFIG = {
    validationInterval: 60 * 60 * 1000, // 验证间隔 (1小时)
    batchSize: 5,                       // 批量大小
    testTimeout: 10,                    // 测试超时 (秒)
    maxConcurrent: 1,                   // 并发数
};
```

## 文件说明

- `node_validator_service.js` - 验证服务主程序
- `validated_nodes.json` - 已验证节点数据库
- `validation_log.json` - 验证日志
- `manage_validator.sh` - 管理脚本
- `ecosystem.config.js` - PM2配置

## 监控和维护

### 每日检查

```bash
# 查看服务状态
pm2 status node-validator

# 查看验证结果
./manage_validator.sh api-status

# 查看最近日志
./manage_validator.sh logs
```

### 故障排查

1. **服务未运行**
   ```bash
   pm2 restart node-validator
   ```

2. **没有找到可用节点**
   - 检查 proxies.json 是否有数据
   - 手动触发验证: `./manage_validator.sh api-validate`
   - 从MacBook推送新节点

3. **验证速度慢**
   - 调整 `CONFIG.testTimeout` 减少超时时间
   - 增加 `CONFIG.maxConcurrent` 提高并发

## 优势

✅ **自动化** - 无需手动干预,后台持续运行
✅ **质量保证** - 只保留真正可用的节点
✅ **分级管理** - 按质量分级,按需使用
✅ **实时更新** - 每小时自动更新
✅ **API接口** - 方便其他服务调用
✅ **日志记录** - 完整的验证日志

## 与其他组件的关系

```
MacBook推送节点
    ↓
proxies.json (所有节点)
    ↓
node-validator (验证服务)
    ↓
validated_nodes.json (可用节点)
    ↓
app.js (主服务) → 使用已验证节点访问外网
    ↓
获取更多节点 → 更新proxies.json
    ↓
循环...
```

## 总结

节点验证服务解决了核心问题:
1. **自动筛选可用节点** - 不再需要手动测试
2. **质量分级** - 知道哪些节点质量最好
3. **持续更新** - 节点库始终保持新鲜
4. **易于使用** - 简单的API和文件接口

这样,主服务就可以直接使用已验证的高质量节点,大大提高成功率!
