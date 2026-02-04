# 订阅链接说明

## 订阅地址

```
https://home.liukun.com:8443/Projects/Aggregator/subscription.php
```

## 特点

1. **动态读取**：每次访问都实时读取最新的订阅文件，无缓存问题
2. **格式正确**：节点名称用引号包裹，包含纯净度标签，YAML格式完全兼容Clash
3. **自动更新**：页面生成订阅后，链接会自动指向PHP端点

## 使用方法

### 在Clash Verge中导入

1. 打开Clash Verge
2. 点击"配置" → "新建配置"
3. 选择类型：Remote
4. 输入订阅链接：`https://home.liukun.com:8443/Projects/Aggregator/subscription.php`
5. 点击"保存"

### 更新订阅

在Clash Verge中点击"更新"按钮即可获取最新节点。

## 节点信息

- 节点名称格式：`🇺🇸 节点名称 [纯净度93]`
- 纯净度范围：55-100分
- 节点数量：根据生成时的选择（手动勾选或自动选择前50个最快节点）

## 技术说明

- 订阅文件存储在：`data/subscription.yaml`
- PHP端点：`subscription.php`（动态读取YAML文件）
- 响应头设置了无缓存策略，确保每次都获取最新内容
