# Clash 核心手动安装指南

## 方法一：手动下载并上传

### 1. 在本地电脑下载 Clash

访问以下任一地址下载：

**Mihomo (推荐)**
- 下载地址：https://github.com/MetaCubeX/mihomo/releases/download/v1.18.0/mihomo-linux-amd64-v1.18.0.gz
- 或使用镜像：https://ghproxy.com/https://github.com/MetaCubeX/mihomo/releases/download/v1.18.0/mihomo-linux-amd64-v1.18.0.gz

**Clash Premium**
- 下载地址：https://github.com/Dreamacro/clash/releases/tag/premium
- 选择：clash-linux-amd64-2023.08.17.gz

### 2. 解压文件

在本地电脑解压 .gz 文件，得到可执行文件

### 3. 上传到服务器

将解压后的文件上传到服务器：
```bash
# 目标路径
/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/bin/clash
```

### 4. 设置权限

```bash
chmod +x /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/bin/clash
```

### 5. 验证安装

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker
./bin/clash -v
```

## 方法二：使用现有的 Clash

如果服务器上已经安装了 Clash，可以创建软链接：

```bash
cd /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker
mkdir -p bin
ln -s /path/to/your/clash bin/clash
```

## 方法三：不使用 Clash（降级模式）

如果无法安装 Clash，系统会自动降级到简单的 TCP 连接测试模式。

虽然准确度较低，但可以快速筛选出明显不可用的节点。

## 安装完成后

访问项目页面测试：
https://home.liukun.com:8443/Projects/NodeLocalChecker/

系统会自动检测 Clash 是否可用，并在界面上显示当前使用的检测模式。
