# 全网节点获取功能修复完成

## 修复内容

### 1. 移除镜像源，直接通过代理访问Github
**问题**: 使用了`mirror.ghproxy.com`等镜像源
**修复**: 改为通过自己的Clash代理(7950/7951端口)直接访问Github原始地址

### 2. 修复去重逻辑
**问题**: 付费节点和免费节点数据结构不同，导致去重失败（441个节点去重后只剩7个）
**修复**: 
- 付费节点保持原格式（Clash配置对象）
- 免费节点只保留原始链接（raw字段）
- 分别统计和去重

### 3. 优化Linux.do获取逻辑
**修复**: 
- 从HTML页面提取订阅链接（而不是JSON API）
- 增强正则表达式匹配
- 支持YAML和节点链接两种格式

## 工作流程

```
1. 下载付费订阅节点 (6个专线节点)
   ↓
2. 创建Clash配置并启动代理 (7950/7951端口)
   ↓
3. 通过代理获取各来源节点
   ├─ Linux.do (通过代理+Cookie)
   └─ Github源 (通过代理，直接访问raw.githubusercontent.com)
   ↓
4. 停止Clash代理
   ↓
5. 合并去重保存
```

## 测试结果

```
✅ 付费节点: 6个
✅ 免费节点: 433个 (去重后)
✅ 总计: 439个节点
```

### Github源获取详情
- ✓ ermaozi/get_subscribe: 26个节点
- ✓ Pawdroid/Free-servers: 10个节点
- ✓ freefq/free: 15个节点
- ✓ peasoft/NoMoreWalls: 220个节点
- ✓ mfuu/v2ray: 91个节点
- ✓ ts-sf/fly: 73个节点

## 保存文件

```
fetched_nodes/
├── premium_nodes.json    # 付费节点 (6个)
├── free_nodes.json       # 免费节点 (433个)
└── all_nodes.json        # 合并结果
    ├── premium: [...]    # 付费节点数组
    ├── free: [...]       # 免费节点链接数组
    └── total: 439        # 总数
```

## 使用方法

### 命令行运行
```bash
cd Projects/Aggregator
node fetch_all_nodes.js
```

### API调用
```javascript
// 在app.js中已集成
app.get('/api/fetch-all-nodes', async (req, res) => {
    const { main } = require('./fetch_all_nodes');
    const result = await main();
    res.json({ success: true, data: result });
});
```

### Web界面
点击"全网获取"按钮即可触发

## 注意事项

1. **Cookie要求**: Linux.do需要有效的Cookie（存储在`linuxdo_cookie.txt`）
2. **代理端口**: 使用7950/7951端口，不与其他Clash实例冲突
3. **执行时间**: 约30-40秒（取决于网络速度）
4. **自动清理**: 执行完成后自动停止Clash代理

## 下一步

- [ ] 优化Linux.do订阅链接提取（目前提取到0个）
- [ ] 将获取的节点自动导入验证队列
- [ ] 添加定时任务自动更新节点库
