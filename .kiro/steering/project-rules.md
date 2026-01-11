---
inclusion: always
---

# 项目开发规则

## 1. 语言规范
- **全程使用简体中文对话**
- 所有交流、文档、注释均使用简体中文
- 代码注释和文档说明优先使用中文

## 2. 命令信任设置
- 将 `.vscode/settings.json` 中 `TrustedCommand` 下添加的 Trusted Commands 添加到全局设置中
- 确保常用命令被信任，提高开发效率
- 定期同步本地和全局的信任命令列表

## 3. 开发测试域名
- **统一使用 `home.liukun.com` 进行开发和测试**
- 避免使用 `192.168.1.40` 或 `ibubble.vicp.net`
- 所有URL测试、验证、演示均使用 `home.liukun.com`
- 示例：
  - 主站：http://home.liukun.com/
  - Projects页面：http://home.liukun.com/projects.html
  - 香格里拉项目：http://home.liukun.com/Samples/Shangri-la/

## 4. 项目结构
- 网站根目录：`/www/wwwroot/ibubble.vicp.net/`
- 主页：`index.html`
- 项目展示页：`projects.html`
- 子项目目录：
  - `Samples/Shangri-la/` - 天空之境·数智香格里拉
  - `Samples/Proxy/` - 代理测试项目
  - `Samples/AIMovie/` - 时光大师AI影视平台

## 5. 权限管理
- 用户：`gemini`
- 用户组：`www`
- 目录权限：`775` (drwxrwxr-x)
- 文件权限：`664` (rw-rw-r--)
- sudo 免密已配置

## 6. 服务器环境
- Web服务器：宝塔面板 + Nginx
- 80端口：主站 (home.liukun.com)
- 81端口：Shangri_la 备用站点
- PHP版本：8.2

## 7. Stats页面项目同步规则
- **重要**: 在 `Samples/` 目录下增加或删除项目时，必须同步更新 `stats.html` 中的 Deployed Web Projects 部分
- 更新内容包括：
  - 项目卡片HTML结构
  - 项目名称、描述、链接
  - 缩略图路径（如有）
- 确保项目信息与实际部署保持一致
