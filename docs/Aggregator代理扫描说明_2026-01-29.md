# Aggregator 代理扫描功能说明

## 更新时间
2026-01-29 03:45

## 问题背景
服务器在国内，无法直接访问 GitHub，导致节点扫描失败。

## 解决方案

### 1. 代理配置
通过 SOCKS5 代理访问 GitHub：
- 代理服务器：`us.liukun.com:1080`
- 认证：用户名/密码
- 配置文件：`Projects/Aggregator/data/proxy_config.json`

### 2. 环境变量方式
使用 HTTP_PROXY 和 HTTPS_PROXY 环境变量，Python requests 库会自动使用：
```bash
HTTP_PROXY="socks5://username:password@host:port"
HTTPS_PROXY="socks5://username:password@host:port"
```

### 3. 扫描配置
**config.json 配置**：
- ✅ GitHub 爬取：启用（20页）
- ❌ Telegram 爬取：禁用（需要注册机场，浪费时间）
- ❌ Google/Yandex：禁用

**扫描参数**：
```bash
python3 subscribe/collect.py --skip --num 200 --targets clash
```
- `--skip`: 跳过节点可用性测试（加快速度）
- `--num 200`: 使用 200 个线程
- `--targets clash`: 生成 Clash 配置

### 4. 工作流程
1. scan.php 读取代理配置
2. 设置 HTTP_PROXY 和 HTTPS_PROXY 环境变量
3. 执行 collect.py 爬取 GitHub 上的免费订阅
4. 生成 clash.yaml 配置文件
5. parse_nodes.py 解析和过滤节点
6. 保存到 nodes.json

## 预期结果
- GitHub 爬取 20 页，预计获取 200-500 个节点
- 通过 parse_nodes.py 过滤后，保留高质量节点

## 测试命令
```bash
# 通过网页触发扫描
curl "https://home.liukun.com:8443/Projects/Aggregator/api/index.php?action=scan"

# 或直接运行 PHP 脚本
php Projects/Aggregator/scan.php

# 查看实时日志
tail -f Projects/Aggregator/logs/real_scan.log

# 查看节点数量
python3 -c "import json; data=json.load(open('Projects/Aggregator/data/nodes.json')); print(f'节点数: {len(data)}')"
```

## 注意事项
1. **必须启用代理**：服务器在国内，无法直接访问 GitHub
2. **不要使用 PySocks**：环境变量方式更简单可靠
3. **GitHub 爬取需要时间**：20 页大约需要 2-3 分钟
4. **节点质量优先**：parse_nodes.py 会过滤掉低质量节点

## 文件说明
- `scan.php`: 主扫描脚本
- `data/proxy_config.json`: 代理配置
- `external/aggregator/subscribe/config/config.json`: 爬取配置
- `parse_nodes.py`: 节点解析和过滤
- `logs/real_scan.log`: 实时扫描日志
- `data/nodes.json`: 最终节点列表
