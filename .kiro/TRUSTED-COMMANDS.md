# Trusted Commands 配置指南

## 概述

Kiro的Trusted Commands配置存储在VSCode/Cursor的**用户级别设置**中，这意味着配置会自动在所有项目间共享。

**本项目提供跨平台导入工具，一键配置！**
- ✅ 支持 **Cursor** 和 **VSCode**
- ✅ 支持 **Windows** / **macOS** / **Linux**
- ✅ 自动检测编辑器和操作系统
- ✅ 自动备份现有配置
- ✅ 智能合并，不会覆盖你的自定义命令

## 配置位置

脚本会自动检测以下位置（按优先级）：

### Windows
```
%APPDATA%\Cursor\User\settings.json  (优先)
%APPDATA%\Code\User\settings.json
```

### macOS
```
~/Library/Application Support/Cursor/User/settings.json  (优先)
~/Library/Application Support/Code/User/settings.json
```

### Linux
```
~/.config/Cursor/User/settings.json  (优先)
~/.config/Code/User/settings.json
```

## 快速开始

### 一键导入（所有平台）

```bash
# Windows (PowerShell/CMD)
python .kiro/import-trusted-commands.py

# macOS / Linux
python3 .kiro/import-trusted-commands.py
```

就这么简单！脚本会自动：
1. 检测你使用的是 Cursor 还是 VSCode
2. 找到正确的配置文件位置
3. 备份现有配置
4. 合并推荐的命令
5. 提示你重启编辑器

### 验证配置

重启编辑器后，当Kiro建议执行命令时：
- 如果命令在列表中 → 自动执行 ✅
- 如果不在列表中 → 提示确认 ⚠️

## 如何配置

### 方法1: 使用项目提供的配置（推荐，跨平台）

项目已经准备好了推荐的Trusted Commands配置，可以一键导入。

**支持所有平台：Windows, macOS, Linux**

```bash
# Windows (PowerShell/CMD)
python .kiro/import-trusted-commands.py

# macOS / Linux
python3 .kiro/import-trusted-commands.py
```

这个脚本会：
1. 自动检测你的操作系统和VSCode/Cursor安装位置
2. 读取 `.kiro/trusted-commands.json` 中的推荐命令
3. 自动备份你的现有配置
4. 将推荐命令合并到你的用户设置中
5. 提示重启编辑器

**要求**：Python 3.6+（系统通常已预装）

### 方法2: 通过UI界面

1. 打开设置：`Cmd+,` (macOS) 或 `Ctrl+,` (Linux)
2. 搜索：`Kiro Agent: Trusted Commands`
3. 点击"Edit in settings.json"
4. 添加你的命令

### 方法2: 直接编辑配置文件

编辑用户设置文件，添加：

```json
{
  "kiro.agent.trustedCommands": [
    "npm install",
    "npm run build",
    "git pull",
    "git push",
    "bash *.sh",
    "php *.php",
    "python *.py",
    "chmod +x *",
    "mkdir -p *",
    "cp -r * *",
    "mv * *"
  ]
}
```

## 常用命令建议

### 开发相关
- `npm install`
- `npm run dev`
- `npm run build`
- `pnpm install`
- `yarn install`

### Git操作
- `git pull`
- `git push`
- `git status`
- `git add *`
- `git commit -m *`

### 文件操作
- `chmod +x *`
- `chmod 664 *`
- `chmod 775 *`
- `mkdir -p *`
- `cp -r * *`
- `mv * *`
- `rm -rf *`

### 脚本执行
- `bash *.sh`
- `php *.php`
- `python *.py`
- `python3 *.py`

### 服务器管理
- `sudo systemctl restart *`
- `sudo systemctl status *`
- `ps aux | grep *`
- `tail -f *`

## 自动同步

由于Trusted Commands配置存储在用户级别，它会**自动在所有项目间共享**，无需手动同步。

### 验证配置

在任何项目中，当Kiro建议执行命令时：
- 如果命令在Trusted Commands列表中，会自动执行
- 如果不在列表中，会提示你是否信任该命令

### 更新配置

1. 在任何项目中更新Trusted Commands
2. 配置会立即保存到用户设置
3. 所有其他项目会自动使用新配置

## 安全建议

1. **谨慎添加通配符命令**
   - `rm -rf *` 可能很危险
   - 建议具体指定路径

2. **定期审查命令列表**
   - 删除不再使用的命令
   - 确保没有潜在危险的命令

3. **项目特定命令**
   - 对于项目特定的脚本，使用完整路径
   - 例如：`bash /www/wwwroot/ibubble.vicp.net/Projects/Network/start-monitor.sh`

## 本项目常用命令

根据项目规则，建议添加以下命令：

```json
{
  "kiro.agent.trustedCommands": [
    "npm install --registry=https://registry.npmmirror.com",
    "pnpm install --registry=https://registry.npmmirror.com",
    "pip3 install * -i https://pypi.tuna.tsinghua.edu.cn/simple",
    "bash Projects/Network/start-monitor.sh",
    "bash Projects/Network/stop-monitor.sh",
    "chmod 664 *",
    "chmod 775 *",
    "chmod +x *.sh",
    "git pull",
    "git push",
    "php *.php",
    "tail -f *",
    "ps aux | grep *"
  ]
}
```

## 故障排查

### 命令仍然需要确认

1. 检查命令是否完全匹配（包括参数）
2. 尝试使用通配符 `*` 来匹配参数
3. 重启VSCode/Cursor

### 配置不生效

1. 确认编辑的是用户设置，不是工作区设置
2. 检查JSON格式是否正确
3. 重启编辑器

### 导入脚本失败

1. **找不到Python**
   - Windows: 从 python.org 下载安装
   - macOS: 已预装，或使用 `brew install python3`
   - Linux: `sudo apt install python3`

2. **找不到配置文件**
   - 确保已安装 Cursor 或 VSCode
   - 至少打开过一次编辑器（会自动创建配置文件）
   - 检查脚本输出的路径是否正确

3. **权限问题**
   - Windows: 以管理员身份运行
   - macOS/Linux: 检查配置文件权限

4. **JSON格式错误**
   - 查看备份文件，手动恢复
   - 重新安装编辑器

## 团队协作

### 共享配置给其他成员

1. **通过Git共享**
   - 项目的 `.kiro/trusted-commands.json` 已包含在Git仓库中
   - 团队成员克隆项目后，运行导入脚本即可

2. **手动共享**
   - 将 `.kiro/trusted-commands.json` 文件发送给团队成员
   - 团队成员运行 `.kiro/import-trusted-commands.sh` 导入

3. **更新配置**
   - 当你添加新的有用命令时，更新 `.kiro/trusted-commands.json`
   - 提交到Git，团队成员拉取后重新运行导入脚本

### 导入步骤（新成员）

**Windows:**
```powershell
# 1. 克隆项目
git clone <repository-url>
cd ibubble.vicp.net

# 2. 导入 Trusted Commands
python .kiro/import-trusted-commands.py

# 3. 重启 Cursor/VSCode
```

**macOS / Linux:**
```bash
# 1. 克隆项目
git clone <repository-url>
cd ibubble.vicp.net

# 2. 导入 Trusted Commands
python3 .kiro/import-trusted-commands.py

# 3. 重启 Cursor/VSCode
```

### 更新配置（现有成员）

```bash
# 1. 拉取最新代码
git pull

# 2. 重新导入配置（会自动合并）
python3 .kiro/import-trusted-commands.py  # macOS/Linux
python .kiro/import-trusted-commands.py   # Windows

# 3. 重启编辑器
```

## 参考资料

- Kiro文档：查看编辑器内的Kiro帮助
- VSCode设置：https://code.visualstudio.com/docs/getstarted/settings
