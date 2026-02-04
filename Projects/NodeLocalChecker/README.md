# 节点本地检测工具 (Node Local Checker)

## 项目简介

用于检测机场聚合器生成的 Clash 节点在本地网络环境下的连通性和可用性。

## 功能特点

- ✅ **无代理检测**：完全不使用系统代理，直接从服务器本地网络测试节点连通性
- ✅ 解析 Clash YAML 配置文件
- ✅ 10并发滑动窗口检测机制
- ✅ 支持两种检测模式：
  - **Clash 真实测试**：使用 Clash 核心进行真实代理连接测试（推荐）
  - **TCP 简单测试**：简单的 TCP 连接测试（降级模式，准确度较低）
- ✅ 导出可用节点为 Clash 配置文件
- ✅ 赛博朋克风格界面

## 快速开始

### 1. 访问项目

https://home.liukun.com:8443/Projects/NodeLocalChecker/

### 2. 上传配置文件

从 [机场聚合器](https://us.liukun.com:8443/Projects/Aggregator/) 导出 Clash 配置文件（YAML格式）

### 3. 选择节点并检测

- 点击"全选"或手动选择要检测的节点
- 点击"开始检测选中节点"
- 系统会以10个并发进行检测

### 4. 导出可用节点

检测完成后，选择可用节点，点击"导出选中节点"

## Clash 核心安装（可选但推荐）

### 为什么需要 Clash？

- **TCP 测试**：只能测试端口是否开放，无法验证节点是否真正可用
- **Clash 测试**：通过真实代理连接测试，准确判断节点可用性

### 安装方法

详见：[INSTALL_CLASH.md](INSTALL_CLASH.md)

**简要步骤：**
1. 下载 Clash 核心（Mihomo 或 Clash Premium）
2. 上传到服务器 `Projects/NodeLocalChecker/bin/clash`
3. 设置执行权限：`chmod +x bin/clash`

系统会自动检测 Clash 是否可用，并在界面上显示当前使用的检测模式。

## 技术栈

- **前端**：原生 JavaScript + 赛博朋克风格 CSS
- **后端**：PHP 8.2 + Python 3
- **依赖**：
  - PHP: Symfony YAML
  - Python: requests, PyYAML

## 项目结构

```
Projects/NodeLocalChecker/
├── index.html              # 主页面
├── js/
│   └── app.js             # 前端逻辑（10并发检测）
├── api/
│   ├── parse.php          # 解析 YAML
│   ├── check.php          # 节点检测
│   ├── check_clash.php    # 检查 Clash 状态
│   └── export.php         # 导出配置
├── scripts/
│   ├── check_node.py      # TCP 简单测试
│   └── check_node_clash.py # Clash 真实测试
├── bin/
│   └── clash              # Clash 核心（需手动安装）
├── yamls/                 # 配置文件目录
├── logs/                  # 日志目录
├── README.md              # 本文件
└── INSTALL_CLASH.md       # Clash 安装指南
```

## 使用说明

### 检测模式

系统会自动选择检测模式：

1. **优先使用 Clash 核心**（如果已安装）
   - 真实代理连接测试
   - 准确度高
   - 速度较慢（每个节点约3-10秒）

2. **降级到 TCP 测试**（如果 Clash 未安装）
   - 简单的端口连通性测试
   - 速度快（每个节点约1-2秒）
   - 准确度较低（可能误判）

### 并发检测

- 使用滑动窗口机制，最多10个节点同时检测
- 自动管理并发队列，避免资源耗尽
- 实时显示检测进度和结果

### 导出配置

导出的 YAML 文件可直接用于 Clash Verge 等客户端，包含：
- 代理节点列表
- 代理组配置
- 路由规则

## 注意事项

1. **网络环境**：本工具在本地服务器运行，检测结果反映本地网络环境的连通性
2. **检测时间**：使用 Clash 模式时，大量节点检测可能需要较长时间
3. **准确性**：强烈建议安装 Clash 核心以获得准确的检测结果
4. **并发限制**：默认10并发，可在 `js/app.js` 中修改 `CONCURRENT_LIMIT` 常量

## 开发信息

- **开发时间**：2026-02-04
- **版本**：v1.0
- **作者**：Gemini
- **测试域名**：https://home.liukun.com:8443/Projects/NodeLocalChecker/

## 更新日志

### v1.0 (2026-02-04)
- ✅ 初始版本发布
- ✅ 实现 YAML 解析和节点检测
- ✅ 10并发滑动窗口检测机制
- ✅ 支持 Clash 真实测试和 TCP 简单测试
- ✅ 赛博朋克风格界面
- ✅ 自动检测 Clash 状态并显示
