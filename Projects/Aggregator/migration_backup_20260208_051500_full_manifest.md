# 国内迁移备份清单 - migration_backup_20260208_051500_full

**备份时间**: 2026-02-08 05:15:00 (北京时间 18:15:00)
**备份大小**: 约 100MB (压缩后)
**备份文件**: `migration_backup_20260208_051500_full.tar.gz`
**文件数量**: 3667 个文件/目录
**用途**: 国内服务器迁移（无需网络安装依赖）

---

## 🎯 此备份特点

✅ **包含 node_modules** - 无需执行 `npm install`
✅ **包含 external 目录** - 所有 GitHub 第三方组件
✅ **包含所有 Clash 核心** - 多平台二进制文件
✅ **开箱即用** - 解压后直接运行

---

## 📦 备份内容概览

### 1. 核心应用文件
| 文件名 | 说明 |
|--------|------|
| `app.js` | 主应用程序 (117KB) |
| `index.js` | 入口文件 |
| `ecosystem.config.js` | PM2 进程管理配置 |
| `package.json` | NPM 依赖配置 |
| `package-lock.json` | 依赖版本锁定文件 |

### 2. Node.js 依赖 (node_modules/) ⭐
| 依赖包 | 版本 | 说明 |
|--------|------|------|
| `imap-simple` | ^5.1.0 | IMAP 邮件客户端 |
| `js-yaml` | ^4.1.1 | YAML 解析器 |
| `mailparser` | ^3.9.3 | 邮件解析器 |
| `node-cron` | ^4.2.1 | 定时任务调度 |
| `puppeteer-core` | ^19.11.1 | 浏览器自动化 |

### 3. 第三方接口模块
| 文件名 | 说明 |
|--------|------|
| `linuxdo_auth.js` | Linux.do 认证模块 |
| `linuxdo_cookie.txt` | Linux.do 登录凭证 |
| `tempmail_service.js` | 临时邮箱服务模块 |
| `webmail_service.js` | Web邮箱服务模块 |

### 4. Clash 核心文件 ⭐
| 文件/目录 | 说明 |
|-----------|------|
| `bin/clash` | **Clash 核心可执行文件 (30MB)** |
| `clash_bin/clash-linux-amd64` | Clash Linux AMD64 版本 |
| `clash_bin/config.yaml` | Clash 配置 |
| `clash_data/` | Clash 运行数据 |
| `clash_template.yaml` | Clash 模板配置 |

### 5. External 目录 (GitHub 第三方组件) ⭐
| 目录/文件 | 说明 |
|-----------|------|
| `external/aggregator/` | 聚合器核心组件 |
| `external/aggregator/clash/` | **多平台 Clash 二进制文件** |
| `external/aggregator/clash/clash-darwin-amd` | macOS Intel 版 |
| `external/aggregator/clash/clash-darwin-arm` | macOS ARM 版 |
| `external/aggregator/clash/clash-linux-amd` | Linux AMD64 版 |
| `external/aggregator/clash/clash-linux-arm` | Linux ARM 版 |
| `external/aggregator/clash/clash-windows-amd.exe` | Windows 版 |
| `external/aggregator/clash/Country.mmdb` | GeoIP 数据库 |
| `external/aggregator/subconverter/` | **订阅转换器 (完整)** |
| `external/aggregator/subscribe/` | 订阅处理脚本 |
| `external/aggregator/tools/` | 工具脚本 |
| `external/aggregator/data/` | 数据文件 |

### 6. 配置文件
| 文件名 | 说明 |
|--------|------|
| `email_config.json` | 邮箱配置 |
| `.gitignore` | Git 忽略规则 |
| `.vscode/settings.json` | VS Code 编辑器配置 |
| `.agent/workflows/website-recovery.md` | 网站恢复工作流 |

### 7. 数据文件
| 文件名 | 说明 |
|--------|------|
| `proxies.json` | 代理节点数据 (350KB) |
| `purity_db.json` | 纯净度检测数据库 |
| `manual_proxies.json` | 手动添加的代理 |
| `cron_logs.json` | 定时任务日志 |

### 8. 日志文件 (logs/)
| 文件名 | 说明 |
|--------|------|
| `logs/app.log` | 应用日志 |
| `logs/error.log` | 错误日志 |
| `logs/clash.log` | Clash 日志 |

> ⚠️ 注意：`logs/out.log` (62MB) 已排除以减小备份体积

### 9. 前端项目 (Projects/Aggregator/)
| 文件名 | 说明 |
|--------|------|
| `index.html` | Aggregator 前端页面 |
| `Aggregator.yaml` | 生成的订阅配置文件 |
| `docs/` | 参考文档 |

### 10. 文档文件
| 文件名 | 说明 |
|--------|------|
| `README.md` | 项目说明文档 |
| `CHANGELOG.md` | 变更日志 |
| `rules/rules.md` | 规则文档 |

---

## 🚫 排除内容

| 目录/文件 | 原因 |
|-----------|------|
| `.git/` | Git 版本控制数据 |
| `backups/` | 旧备份文件 |
| `docs/temp/` | 临时文件 |
| `logs/out.log` | 大文件 (62MB)，减小备份体积 |
| `myenv/` | Python 虚拟环境 (如需要可单独备份) |

---

## 🔧 国内服务器恢复步骤

```bash
# 1. 上传备份文件到国内服务器
scp migration_backup_20260208_051500_full.tar.gz user@server:/opt/1panel/apps/

# 2. 创建目录并解压
cd /opt/1panel/apps
mkdir -p my-node-site
cd my-node-site
tar -xzvf ../migration_backup_20260208_051500_full.tar.gz

# 3. 确保可执行权限
chmod +x bin/clash
chmod +x clash_bin/clash-linux-amd64
chmod +x external/aggregator/clash/clash-*
chmod +x external/aggregator/subconverter/subconverter

# 4. 安装 PM2 (如未安装)
npm install -g pm2

# 5. 启动服务
pm2 start ecosystem.config.js

# 6. 验证服务
pm2 status
curl http://localhost:3000

# 7. 配置 Nginx (如需要)
# 参考原服务器的 Nginx 配置
```

---

## ⚠️ 注意事项

1. **Node.js 版本**: 建议使用 Node.js 18+ 版本
2. **PM2**: 需要全局安装 `npm install -g pm2`
3. **端口**: 默认运行在 3000 端口
4. **Nginx**: 需要配置反向代理 (参考原服务器配置)
5. **防火墙**: 确保开放必要端口

---

## ✅ 备份验证

备份已成功创建，包含 **3667** 个文件/目录，压缩后大小约 **100MB**。

**已包含所有第三方依赖**:
- ✅ node_modules (NPM 依赖)
- ✅ external/aggregator (GitHub 组件)
- ✅ Clash 核心 (多平台)
- ✅ Subconverter (订阅转换器)
- ✅ 所有配置和数据文件
