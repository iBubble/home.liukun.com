# Kiro 配置文件

本目录包含项目的Kiro配置和工具脚本。

## 文件说明

- **steering/** - Kiro引导规则（自动加载）
  - `project-rules.md` - 项目开发规则
  
- **trusted-commands.json** - 推荐的Trusted Commands配置
- **import-trusted-commands.sh** - 一键导入脚本
- **TRUSTED-COMMANDS.md** - 详细配置指南

## 快速开始

### 新成员加入项目

```bash
# 1. 克隆项目后，导入推荐的命令配置
./.kiro/import-trusted-commands.sh

# 2. 重启 VSCode/Cursor
```

### 更新配置

```bash
# 拉取最新代码后，重新导入配置
git pull
./.kiro/import-trusted-commands.sh
```

## 详细文档

- [Trusted Commands 配置指南](./TRUSTED-COMMANDS.md)
- [项目开发规则](./steering/project-rules.md)

## 维护

### 添加新的Trusted Command

1. 编辑 `trusted-commands.json`
2. 添加新命令到 `trustedCommands` 数组
3. 提交到Git
4. 通知团队成员重新导入

### 示例

```json
{
  "trustedCommands": [
    "npm install",
    "git pull",
    "新命令在这里"
  ]
}
```
