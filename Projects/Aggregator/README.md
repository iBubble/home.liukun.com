# 机场聚合器 - Airport Aggregator

一个基于Web的机场节点聚合工具，可以自动扫描、测速并生成订阅链接。

## 🎯 项目简介

这是桌面版机场聚合器的Web版本，提供了更友好的用户界面和更便捷的部署方式。基于GitHub上的[wzdnzd/aggregator](https://github.com/wzdnzd/aggregator)项目核心，实现了完整的机场节点聚合功能。

## ✨ 主要功能

- **🕷️ 多源扫描** - 自动从多个平台获取免费机场节点
- **🔍 智能测速** - 自动检测节点延迟和可用性
- **🔄 格式转换** - 支持Clash、V2Ray等多种客户端格式
- **🌐 Web界面** - 现代化的响应式Web界面
- **📊 实时监控** - 实时显示扫描进度和节点状态
- **🔄 自动更新** - 支持从GitHub自动更新核心代码
- **📱 移动适配** - 完美支持手机和平板设备

## 🚀 快速开始

### 访问地址
- 开发环境: https://home.liukun.com:8443/Projects/Aggregator/
- 生产环境: 根据实际部署调整

### 基本操作

1. **更新核心代码**
   - 点击右上角"更新核心"按钮
   - 系统会自动从GitHub克隆/更新aggregator项目
   - 自动安装Python依赖

2. **扫描节点**
   - **快速扫描**: 仅获取节点，不进行测速验证
   - **完整扫描**: 获取节点并进行延迟测试（推荐）

3. **启动订阅服务**
   - 点击"启动订阅服务器"
   - 复制生成的订阅链接
   - 在Clash Verge等客户端中添加订阅

## 📁 项目结构

```
Projects/Aggregator/
├── index.html              # 主页面
├── js/
│   └── app.js              # 前端JavaScript逻辑
├── api/
│   └── index.php           # 后端API接口
├── external/
│   └── aggregator/         # 核心聚合器代码（自动下载）
├── data/                   # 数据存储目录
│   ├── status.json         # 状态信息
│   └── server.pid          # 服务器进程ID
├── logs/
│   └── aggregator.log      # 运行日志
├── .htaccess              # Apache重写规则
└── README.md              # 项目说明
```

## 🔧 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **样式**: Tailwind CSS + Font Awesome
- **后端**: PHP 8.2
- **核心**: Python 3 + aggregator项目
- **服务器**: Nginx + Apache (.htaccess)

## 📋 功能特性

### Web界面功能
- ✅ 实时状态监控
- ✅ 进度条显示
- ✅ 日志实时输出
- ✅ 节点列表展示
- ✅ 订阅链接生成
- ✅ 设置配置管理
- ✅ 响应式设计

### 后端API功能
- ✅ `/api/status` - 获取系统状态
- ✅ `/api/scan` - 执行节点扫描
- ✅ `/api/server/start` - 启动订阅服务器
- ✅ `/api/server/stop` - 停止订阅服务器
- ✅ `/api/update-core` - 更新核心代码
- ✅ `/api/nodes` - 获取节点列表

### 核心聚合功能
- ✅ 多平台节点爬取
- ✅ 节点有效性验证
- ✅ 延迟测试
- ✅ 格式转换
- ✅ 订阅生成

## ⚙️ 配置说明

### 服务器设置
- **端口**: 默认8088，可在设置中修改
- **测速超时**: 默认3000ms，可调整
- **GitHub Token**: 可选，用于避免API限制

### 文件权限
```bash
# 设置正确的权限
chmod 775 Projects/Aggregator/data
chmod 775 Projects/Aggregator/logs
chmod 775 Projects/Aggregator/external
chmod 664 Projects/Aggregator/api/index.php
```

## 🔍 使用说明

### 1. 首次使用
1. 访问Web界面
2. 点击"更新核心"按钮，等待核心代码下载完成
3. 执行"完整扫描"获取优质节点
4. 启动订阅服务器
5. 复制订阅链接到客户端

### 2. 日常使用
1. 定期执行扫描更新节点
2. 监控服务器运行状态
3. 查看节点质量和延迟
4. 根据需要调整设置

### 3. 客户端配置
支持的客户端：
- Clash Verge
- Clash for Windows
- V2rayN
- Shadowrocket
- 其他支持标准订阅的客户端

## 🐛 故障排除

### 常见问题

1. **核心代码下载失败**
   - 检查网络连接
   - 确认Git已安装
   - 查看日志获取详细错误信息

2. **扫描无结果**
   - 检查Python环境
   - 确认依赖已安装
   - 尝试快速扫描模式

3. **订阅服务器启动失败**
   - 检查端口是否被占用
   - 确认data目录权限
   - 查看系统日志

4. **节点无法连接**
   - 检查防火墙设置
   - 确认客户端配置正确
   - 尝试重新扫描节点

### 日志查看
- Web界面实时日志
- 服务器日志: `logs/aggregator.log`
- 系统日志: 通过系统命令查看

## 🔄 更新维护

### 自动更新
- Web界面点击"更新核心"按钮
- 系统会自动从GitHub拉取最新代码

### 手动更新
```bash
cd Projects/Aggregator/external/aggregator
git pull origin main
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 📞 技术支持

如遇问题，请：
1. 查看Web界面日志
2. 检查服务器日志文件
3. 确认系统环境配置
4. 参考原项目文档: https://github.com/wzdnzd/aggregator

## 📄 许可证

本项目基于原aggregator项目，遵循相应的开源许可证。---**注意**: 本工具仅供学习和研究使用，请遵守当地法律法规。
