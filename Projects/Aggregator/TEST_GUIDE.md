# 手工测试指南

## 测试前准备

### 1. 检查服务状态
```bash
pm2 status
# 确认 aggregator 和 validator 都是 online
```

### 2. 检查代理池
```bash
cat validated_nodes.json | jq '.good | length'
# 应该显示 4 (当前有4个good节点)
```

### 3. 访问前端
打开浏览器访问: https://home.liukun.com:8443/Projects/Aggregator/

---

## 测试流程

### 测试1: Github 更新（快速测试）

**操作步骤**:
1. 点击 "仅更新 Github 节点" 按钮
2. 点击 "查看日志" 按钮观察实时日志

**预期结果**:
```
✅ 🌐 启动代理系统 (代理池: 4 个节点)
✅ ✅ 代理系统已就绪，所有外网请求将通过代理
✅ 准备从 XX 个订阅源获取节点
✅ 进度: XX/XX 个订阅源已处理
✅ 总计获取 XXX 个唯一节点
```

**测试时间**: 约2-3分钟

---

### 测试2: 全网获取（完整测试）

**操作步骤**:
1. 点击 "🔥 全网获取节点 (Free Style)" 按钮
2. 点击 "查看日志" 按钮观察实时日志

**预期结果**:
```
✅ 🌐 启动代理系统 (代理池: 4 个节点)
✅ ✅ 代理系统已就绪
✅ Github 获取完成
✅ 启动深度全网挖掘 (目标: 4 个分享站)
✅ [Web挖矿] 发现 XX 个节点
✅ 开始 Linux.do 论坛抓取
✅ Linux.do 抓取完成，获得 XX 个节点
✅ 深度去重完成
✅ 开始节点验证
✅ 已保存 XX 个有效节点
```

**测试时间**: 约10-15分钟

---

## 关键观察点

### ✅ 代理启动成功
```
🌐 启动代理系统 (代理池: 4 个节点)
🚀 启动抓取代理 [1/4]: [节点名称] (XXms)
✅ 代理已启动: [节点名称]
✅ 代理系统已就绪，所有外网请求将通过代理
```

### ✅ 代理切换（如果发生）
```
⚠️ 请求失败 (尝试 1/3): [错误信息]
🔄 切换到备用代理 [2/4]...
🚀 启动抓取代理 [2/4]: [新节点名称]
✅ 代理已启动: [新节点名称]
```

### ✅ 节点获取成功
```
准备从 XX 个订阅源获取节点
进度: 10/XX 个订阅源已处理
进度: 20/XX 个订阅源已处理
总计获取 XXX 个唯一节点
```

### ⚠️ 可能的警告（正常）
```
⚠️ 未找到可用代理，将使用直连模式
⚠️ 所有代理节点均已尝试，切换到直连模式
⚠️ 已尝试所有代理节点，无可用备用代理
```

---

## 故障排查

### 问题1: 代理启动失败
**症状**: 看到 "⚠️ 未找到可用代理"

**解决方案**:
```bash
# 检查 validated_nodes.json
cat validated_nodes.json | jq '.good, .excellent, .basic'

# 如果为空，检查 seed_proxies.json
cat seed_proxies.json | jq '. | length'

# 如果都为空，需要先导入种子节点
```

### 问题2: 所有代理都失败
**症状**: 看到 "🔄 切换到直连模式重试"

**原因**: 
- 代理节点质量不佳
- 代理节点已失效

**解决方案**:
```bash
# 运行验证器更新节点
pm2 logs validator

# 或手动运行一次全网获取（会自动更新种子节点）
```

### 问题3: 获取节点数量很少
**症状**: 只获取到几十个节点

**可能原因**:
- 代理失败，部分源无法访问
- 源本身节点较少
- 网络问题

**解决方案**:
- 检查日志中的错误信息
- 确认代理系统正常工作
- 等待验证器更新代理池

---

## 成功标准

### Github 更新
- ✅ 代理系统启动成功
- ✅ 获取到 100+ 个节点
- ✅ 验证后有 20+ 个可用节点

### 全网获取
- ✅ 代理系统启动成功
- ✅ Github 源获取成功
- ✅ 分享站获取成功（至少1个站点）
- ✅ Linux.do 获取成功（至少10个节点）
- ✅ 总计获取 200+ 个节点
- ✅ 验证后有 50+ 个可用节点

---

## 测试完成后

### 1. 检查结果
```bash
# 查看节点数量
cat proxies.json | jq '. | length'

# 查看节点分布
cat proxies.json | jq 'group_by(.type) | map({type: .[0].type, count: length})'
```

### 2. 检查种子节点更新
```bash
# 查看种子节点
cat seed_proxies.json | jq '. | length'

# 应该有20个优质节点
```

### 3. 查看自动更新计划
```bash
# 查看日志中的计划任务信息
pm2 logs aggregator --lines 100 | grep "下次执行"
```

---

## 快速命令参考

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs aggregator --lines 50

# 重启服务
pm2 restart aggregator

# 查看节点数量
cat proxies.json | jq '. | length'

# 查看代理池
cat validated_nodes.json | jq '.good | length'

# 查看种子节点
cat seed_proxies.json | jq '. | length'

# 测试API
curl -s https://home.liukun.com:8443/Projects/Aggregator/api/status | jq
```

---

## 联系方式

如有问题，请查看:
- `PROXY_FIX_COMPLETE.md` - 修复详情
- `PROXY_USAGE_ANALYSIS.md` - 代理使用分析
- `PROXY_SYSTEM.md` - 代理系统文档

**准备好了就开始测试吧！** 🚀
