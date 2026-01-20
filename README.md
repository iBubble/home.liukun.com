# Gemini's Cyberpunk Home

🌐 **在线访问**: [https://home.liukun.com:8443](https://home.liukun.com:8443)

一个融合赛博朋克美学与现代 Web 技术的个人主页项目，展示多个创新 Web 应用。

## ✨ 特性

- 🎨 赛博朋克风格设计
- 🌈 动态背景和光晕效果
- 📱 完全响应式布局
- ⚡ 高性能优化
- 🎭 炫酷的动画和过渡效果
- 📊 实时服务器状态监控
- 🌍 多语言支持（部分项目）

## 📂 项目结构

```
.
├── index.html              # 主页
├── projects.html           # 项目展示页
├── stats.html              # 服务器统计页面
├── 404.html                # 404 错误页面
├── favicon.svg             # 网站图标
├── .htaccess               # Apache 配置
├── .user.ini               # PHP 配置
├── .gitignore              # Git 忽略规则
├── backup-full-site.sh     # 全站备份脚本
│
├── api/                    # API 接口
│   └── server-stats.php    # 服务器统计 API
│
├── Projects/               # 子项目目录
│   ├── AIMovie/            # 拾光大师 AI 影视平台
│   ├── Shangri-la/         # 天空之境·数智香格里拉
│   ├── LuckyCoin/          # 一元奇梦电影项目网站
│   ├── Exam/               # 在线考试系统
│   └── Proxy/              # 代理测试项目
│
├── docs/                   # 文档目录
│   ├── AIMovie*.md         # AIMovie 项目文档
│   ├── LuckyCoin*.md       # LuckyCoin 项目文档
│   ├── Stats*.md           # Stats 页面文档
│   └── SSL*.md             # SSL 证书配置文档
│
├── Processes/              # 测试和开发过程文件
│   ├── analyze_structure.py
│   ├── check_indent.py
│   └── ...
│
└── .kiro/                  # Kiro AI 配置
    └── steering/           # 项目开发规则
        └── project-rules.md
```

## � 快速开始

### 本地运行

1. 克隆仓库：
```bash
git clone https://github.com/ibubble/home.liukun.com.git
cd home.liukun.com
```

2. 使用任意 Web 服务器运行：
```bash
# 使用 Python
python -m http.server 8000

# 或使用 PHP
php -S localhost:8000

# 或使用 Node.js (需要安装 http-server)
npx http-server
```

3. 在浏览器中访问 `http://localhost:8000`

### 生产环境部署

项目使用 Nginx + 宝塔面板部署：

- **域名**: home.liukun.com:8443
- **协议**: HTTPS (SSL 证书已配置)
- **Web 服务器**: Nginx
- **PHP 版本**: 8.2
- **进程管理**: PM2 (用于 Node.js 项目)

## 🛠️ 技术栈

### 主站
- **前端**: HTML5, CSS3, JavaScript (原生)
- **后端**: PHP 8.2
- **服务器**: Nginx + 宝塔面板
- **样式**: 自定义 CSS (赛博朋克主题)
- **图表**: Chart.js

### 子项目技术栈
- **React 18** + TypeScript (LuckyCoin)
- **Webpack 5** / Vite (构建工具)
- **Tailwind CSS** (样式框架)
- **Framer Motion** (动画库)
- **i18next** (国际化)
- **Zustand** (状态管理)
- **PM2** (进程管理)

## 📦 子项目介绍

### 🎬 一元奇梦 Lucky Coin
**访问**: [https://home.liukun.com:8443/Projects/LuckyCoin/](https://home.liukun.com:8443/Projects/LuckyCoin/)

电影项目展示网站，魔幻现实主义 × 黑色幽默 × 移民叙事。

**特性**:
- ✅ 双模式主题系统（梦境/现实）
- ✅ 创新交互设计（老虎机入口、故障艺术效果）
- ✅ 多语言支持（中文、英语、意大利语）
- ✅ 完整的项目展示（故事板、角色、导演风格、众筹、投资人专区）
- ✅ 响应式设计

**技术**: React 18 + TypeScript + Webpack 5 + Tailwind CSS + i18next

### 🎥 拾光大师 AI 影视平台
**访问**: [https://home.liukun.com:8443/Projects/AIMovie/](https://home.liukun.com:8443/Projects/AIMovie/)

基于 AI 技术的影视创作平台，提供从选题到发布的完整创作流程。

**功能**:
- 选题策划和剧本生成
- 角色设定和选角匹配
- 分镜设计和场景规划
- 视频编辑和特效制作
- AI 对话和语音生成
- 资产市场和素材管理

**技术**: React 18 + TypeScript + Redux Toolkit + Webpack 5 + Tailwind CSS

### 🏔️ 天空之境·数智香格里拉
**访问**: [https://home.liukun.com:8443/Projects/Shangri-la/](https://home.liukun.com:8443/Projects/Shangri-la/)

迪庆州"低空经济+智慧文旅"空地一体化建设方案展示。

**内容**:
- 项目概览和建设方案
- 应用场景展示
- 投资收益分析
- 智慧旅游解决方案
- 应急救援系统（新增）
- 哈巴雪山营地选址资料

**技术**: HTML5 + CSS3 + JavaScript + Chart.js + D3.js + Pannellum (360全景)

### 📝 在线考试系统
**访问**: [https://home.liukun.com:8443/Projects/Exam/](https://home.liukun.com:8443/Projects/Exam/)

完整的在线考试管理系统。

**功能**:
- 学生管理
- 试题管理
- 组卷考试
- 成绩统计

### 🔧 代理测试项目
**访问**: [https://home.liukun.com:8443/Projects/Proxy/Proxy.php](https://home.liukun.com:8443/Projects/Proxy/Proxy.php)

用于测试和验证代理服务器功能的工具项目。

## 📊 服务器监控

访问 [Stats 页面](https://home.liukun.com:8443/stats.html) 查看实时服务器状态：

- CPU 使用率
- 内存使用率
- 磁盘使用率
- 网络流量
- 系统负载
- 服务状态
- 已部署项目

## 📝 开发规范

### 语言规范
- 使用简体中文进行开发文档和注释
- 代码注释优先使用中文

### 域名规范
- 统一使用 `home.liukun.com:8443` 作为开发测试域名（HTTPS）
- 避免使用 IP 地址或其他域名

### 权限管理
- 用户：`gemini`
- 用户组：`www`
- 目录权限：`775` (drwxrwxr-x)
- 文件权限：`664` (rw-rw-r--)

### 目录规范
- 文档类文件（*.md）放入 `docs/` 目录
- 测试过程文件放入 `Processes/` 目录
- 根目录保持清晰简洁

### 镜像源配置
- **npm**: 使用淘宝镜像 `https://registry.npmmirror.com`
- **pip**: 使用清华镜像 `https://pypi.tuna.tsinghua.edu.cn/simple`

详细规范请查看 [项目开发规则](.kiro/steering/project-rules.md)

## 🔧 维护工具

### 全站备份
```bash
./backup-full-site.sh
```

自动备份：
- 网站文件
- 数据库
- Nginx 配置
- SSL 证书
- PM2 配置
- 系统配置

备份保存在 `backups/` 目录，自动保留最近 5 个备份。

### PM2 进程管理
```bash
# 查看进程状态
pm2 list

# 查看日志
pm2 logs

# 重启进程
pm2 restart all

# 保存进程列表
pm2 save
```

## 📈 项目统计

- **总项目数**: 5 个
- **在线项目**: 5 个
- **技术栈**: 10+ 种
- **代码行数**: 50,000+ 行
- **文档数量**: 50+ 份

## 🤝 联系方式

- **Email**: gemini@liukun.com
- **GitHub**: [@ibubble](https://github.com/ibubble)
- **X.com**: [@iBubbleKun](https://x.com/iBubbleKun)
- **Facebook**: [iBubbleKun](https://www.facebook.com/iBubbleKun)

## 📄 许可证

MIT License

## 🙏 致谢

- 感谢 [Kiro AI](https://kiro.ai) 提供的开发辅助
- 感谢所有开源项目的贡献者

---

© 2026 Gemini's Cyberpunk Domain | Powered by Innovation & Creativity ✨
