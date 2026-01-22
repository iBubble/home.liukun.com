---
inclusion: always
---

# 项目开发规则

## 0. 开发环境
- **开发电脑**: MacBook Pro
- **操作系统**: macOS 26
- **服务器**: Ubuntu 24.04.3 LTS
- **远程开发**: 通过SSH连接到服务器进行开发和部署

## 1. 语言规范
- **全程使用简体中文对话**
- 所有交流、文档、注释均使用简体中文
- 代码注释和文档说明优先使用中文

## 2. 命令信任设置
- Kiro的Trusted Commands配置存储在**用户级别设置**中，自动在所有项目间共享
- 配置文件位置（macOS）：`~/Library/Application Support/Cursor/User/settings.json`
- 配置文件位置（Linux）：`~/.config/Code/User/settings.json`
- 通过UI配置：打开设置（Cmd+,）搜索"Kiro Agent: Trusted Commands"
- 详细说明参见：`.kiro/TRUSTED-COMMANDS.md`
- 建议添加的命令：
  - 包管理：`npm install --registry=https://registry.npmmirror.com`
  - Git操作：`git pull`, `git push`
  - 脚本执行：`bash *.sh`, `php *.php`, `python3 *.py`
  - 权限管理：`chmod 664 *`, `chmod 775 *`, `chmod +x *.sh`
  - 项目脚本：`bash Projects/Network/start-monitor.sh`, `bash Projects/Network/stop-monitor.sh`

## 3. 开发测试域名
- **统一使用 `home.liukun.com:8443` 进行开发和测试（HTTPS）**
- 避免使用 `192.168.1.40` 或 `ibubble.vicp.net`
- 所有URL测试、验证、演示均使用 `home.liukun.com:8443`
- 示例：
  - 主站：https://home.liukun.com:8443/
  - Projects页面：https://home.liukun.com:8443/projects.html
  - 香格里拉项目：https://home.liukun.com:8443/Projects/Shangri-la/
  - AIMovie项目：https://home.liukun.com:8443/Projects/AIMovie/

## 4. 项目结构
- 网站根目录：`/www/wwwroot/ibubble.vicp.net/`
- 主页：`index.html`
- 项目展示页：`projects.html`
- 子项目目录：
  - `Projects/Shangri-la/` - 天空之境·数智香格里拉
  - `Projects/Proxy/` - 代理测试项目
  - `Projects/AIMovie/` - 时光大师AI影视平台

## 5. 权限管理
- 用户：`gemini`
- 用户组：`www`
- 目录权限：`775` (drwxrwxr-x)
- 文件权限：`664` (rw-rw-r--)
- sudo 免密已配置

## 6. 服务器环境
- Web服务器：宝塔面板 + Nginx
- 8443端口：主站 HTTPS (home.liukun.com:8443)
- 81端口：Shangri_la 备用站点
- PHP版本：8.2

## 7. Stats页面项目同步规则
- **重要**: 在 `Projects/` 目录下增加或删除项目时，必须同步更新 `stats.html` 中的 Deployed Web Projects 部分
- 更新内容包括：
  - 项目卡片HTML结构
  - 项目名称、描述、链接
  - 缩略图路径（如有）
- 确保项目信息与实际部署保持一致

## 8. 根目录文件整理规范
- **保持根目录清晰简洁**
- 文档类文件（*.md）放入 `docs/` 目录
- 测试过程文件（测试脚本、临时html等）放入 `Processes/` 目录
- 根目录只保留：
  - 核心页面文件（index.html, projects.html, stats.html, 404.html）
  - 配置文件（.htaccess, .user.ini, .gitignore）
  - README.md（项目说明）
  - favicon.svg（网站图标）
- 开发过程中生成的文档和测试文件必须及时归类

## 9. 国内镜像源配置
- **所有包管理器必须使用国内镜像源以提高下载速度**
- **Python pip**: 使用清华镜像源
  - 命令格式：`pip3 install <package> -i https://pypi.tuna.tsinghua.edu.cn/simple`
  - 或使用：`pip3 install <package> --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple`
- **Node.js npm**: 使用淘宝镜像源
  - 命令格式：`npm install <package> --registry=https://registry.npmmirror.com`
  - 或配置：`npm config set registry https://registry.npmmirror.com`
- **Node.js pnpm**: 使用淘宝镜像源
  - 命令格式：`pnpm install <package> --registry=https://registry.npmmirror.com`
- **Ubuntu apt**: 使用阿里云镜像源
  - 已配置在 `/etc/apt/sources.list`
- **Docker**: 使用阿里云/网易镜像源
  - 配置在 `/etc/docker/daemon.json`
