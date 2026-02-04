# NodeLocalChecker 去重逻辑修复

**日期**: 2026-02-05  
**问题**: 节点数量过少,很多有效节点被错误去重  
**状态**: ✅ 已修复

---

## 问题分析

### 原始问题

用户反馈导入 `Aggregator.yaml` 后只有82个节点,但在 Clash Verge 中导入同一文件有170-220个节点。

### 数据统计

```
YAML文件实际节点数: 174个
去重后唯一节点数: 89个
数据库中节点数: 82个
```

### 问题原因

**旧的去重逻辑**:
```php
// 只使用 type + server + port
$key = sprintf('%s:%s:%d', $type, $server, $port);
```

**问题**:
- 很多节点使用相同的服务器和端口
- 但它们的 UUID/密码 完全不同
- 这些是**不同的节点**,不应该被去重!

### 实际案例

同一服务器 `154.31.114.125:443` 有17个vless节点:

| 节点名称 | UUID | 是否相同 |
|---------|------|---------|
| JP-日本 | 5cc76475-fa94-... | ❌ |
| 🇯🇵 日本 152 | 7e0696bf-8874-... | ❌ |
| JP-日本_1 | 17e9a931-45f9-... | ❌ |
| JP-日本_2 | d4400d76-234e-... | ❌ |
| ... | ... | ❌ |

**结论**: 17个不同的UUID = 17个不同的节点,但旧逻辑只保留了1个!

---

## 解决方案

### 新的去重逻辑

根据不同节点类型使用不同的唯一标识:

```php
switch ($type) {
    case 'vless':
    case 'vmess':
        // type + server + port + uuid
        $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $uuid);
        break;
        
    case 'trojan':
    case 'ss':
    case 'ssr':
        // type + server + port + password
        $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $password);
        break;
        
    case 'hysteria2':
        // type + server + port + password/auth
        $password = $raw['password'] ?? $raw['auth'] ?? '';
        $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $password);
        break;
        
    default:
        // 其他类型: type + server + port
        $key = sprintf('%s:%s:%d', $type, $server, $port);
        break;
}
```

### 修改的文件

- `Projects/NodeLocalChecker/api/storage.php` - `generateNodeHash()` 函数

---

## 预期效果

### 修复前

```
YAML文件: 174个节点
去重后: 89个节点 (丢失85个)
数据库: 82个节点
```

### 修复后

```
YAML文件: 174个节点
去重后: ~170个节点 (只去除真正重复的)
数据库: ~170个节点
```

---

## 测试验证

### 测试1: 相同服务器不同UUID

```php
$nodes = [
    ['type' => 'vless', 'server' => '1.1.1.1', 'port' => 443, 'uuid' => 'uuid-1'],
    ['type' => 'vless', 'server' => '1.1.1.1', 'port' => 443, 'uuid' => 'uuid-2'],
    ['type' => 'vless', 'server' => '1.1.1.1', 'port' => 443, 'uuid' => 'uuid-1'], // 重复
];

结果:
  总节点数: 3
  唯一节点数: 2 ✅ 正确
  重复节点数: 1
```

### 测试2: 实际YAML文件

```bash
# 154.31.114.125:443 的17个vless节点
旧逻辑: 只保留1个 ❌
新逻辑: 保留17个 ✅
```

---

## 使用说明

### 重新导入节点

由于去重逻辑已修改,建议重新导入节点以获取完整数据:

1. **访问页面**:
   ```
   https://home.liukun.com:8443/Projects/NodeLocalChecker/
   ```

2. **点击"一键导入"**:
   - 系统会自动下载最新的 Aggregator.yaml
   - 使用新的去重逻辑合并节点
   - 保留已有节点的检测历史

3. **查看结果**:
   - 节点数量应该从82个增加到~170个
   - 国家筛选器会显示更多国家
   - 每个国家的节点数量会更新

### 数据安全

- ✅ 已有节点的检测历史会保留
- ✅ 只添加新节点,不删除旧节点
- ✅ 自动备份数据文件

---

## 技术细节

### 为什么不同节点使用相同服务器?

这是正常的代理服务器配置:

1. **多用户共享**: 一个服务器可以服务多个用户
2. **负载均衡**: 通过不同UUID分配流量
3. **权限控制**: 不同UUID有不同的权限和配额

### UUID的作用

- **身份识别**: 每个UUID代表一个独立的账户
- **流量统计**: 服务器根据UUID统计流量
- **访问控制**: 不同UUID可能有不同的访问权限

### 为什么之前的逻辑会这样设计?

- **简化**: 最初可能认为同一服务器+端口就是同一节点
- **误解**: 没有考虑到多用户共享的场景
- **测试不足**: 测试数据可能没有这种情况

---

## 影响范围

### 受影响的节点类型

- ✅ **vless**: 使用UUID区分
- ✅ **vmess**: 使用UUID区分
- ✅ **trojan**: 使用password区分
- ✅ **ss/ssr**: 使用password区分
- ✅ **hysteria2**: 使用password/auth区分

### 不受影响的节点类型

- 其他未知类型仍使用 type+server+port

---

## 相关文档

- [节点持久化完成](./NodeLocalChecker_节点持久化完成_2026-02-05.md)
- [完整功能总结](./NodeLocalChecker_完整功能总结_2026-02-05.md)
- [最终完成总结](./NodeLocalChecker_最终完成总结_2026-02-05.md)

---

**修复完成时间**: 2026-02-05  
**修复状态**: ✅ 代码已部署  
**建议操作**: 重新导入节点以获取完整数据
