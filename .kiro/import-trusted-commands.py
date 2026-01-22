#!/usr/bin/env python3
"""
Trusted Commands 导入工具 (跨平台)
支持 Windows, macOS, Linux
"""

import json
import os
import sys
import shutil
from pathlib import Path
from datetime import datetime

# 颜色输出
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'  # No Color
    
    @staticmethod
    def supports_color():
        """检查终端是否支持颜色"""
        return hasattr(sys.stdout, 'isatty') and sys.stdout.isatty()
    
    @classmethod
    def print(cls, text, color=None):
        """打印带颜色的文本"""
        if color and cls.supports_color():
            print(f"{color}{text}{cls.NC}")
        else:
            print(text)

def get_script_dir():
    """获取脚本所在目录"""
    return Path(__file__).parent.absolute()

def get_settings_file():
    """获取VSCode/Cursor设置文件路径"""
    if sys.platform == 'darwin':  # macOS
        possible_paths = [
            Path.home() / 'Library/Application Support/Cursor/User/settings.json',
            Path.home() / 'Library/Application Support/Code/User/settings.json',
        ]
    elif sys.platform == 'win32':  # Windows
        appdata = os.getenv('APPDATA')
        possible_paths = [
            Path(appdata) / 'Code/User/settings.json',
            Path(appdata) / 'Cursor/User/settings.json',
        ]
    else:  # Linux
        possible_paths = [
            Path.home() / '.config/Code/User/settings.json',
            Path.home() / '.config/Cursor/User/settings.json',
        ]
    
    for path in possible_paths:
        if path.exists():
            return path
    
    return None

def load_trusted_commands():
    """加载推荐的Trusted Commands"""
    config_file = get_script_dir() / 'trusted-commands.json'
    
    if not config_file.exists():
        Colors.print(f"错误: 找不到 {config_file}", Colors.RED)
        sys.exit(1)
    
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get('trustedCommands', [])
    except Exception as e:
        Colors.print(f"错误: 无法解析配置文件: {e}", Colors.RED)
        sys.exit(1)

def backup_settings(settings_file):
    """备份设置文件"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = Path(str(settings_file) + f'.backup.{timestamp}')
    shutil.copy2(settings_file, backup_file)
    return backup_file

def load_settings(settings_file):
    """加载现有设置"""
    try:
        with open(settings_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        Colors.print(f"错误: 无法解析设置文件: {e}", Colors.RED)
        sys.exit(1)

def save_settings(settings_file, settings):
    """保存设置"""
    try:
        with open(settings_file, 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)
    except Exception as e:
        Colors.print(f"错误: 无法保存设置文件: {e}", Colors.RED)
        sys.exit(1)

def main():
    Colors.print("\n=== Kiro Trusted Commands 导入工具 ===\n", Colors.GREEN)
    
    # 加载推荐命令
    commands = load_trusted_commands()
    
    if not commands:
        Colors.print("错误: 配置文件中没有命令", Colors.RED)
        sys.exit(1)
    
    Colors.print("找到以下推荐的 Trusted Commands:\n")
    for i, cmd in enumerate(commands, 1):
        print(f"  {i}. {cmd}")
    print()
    
    # 查找设置文件
    settings_file = get_settings_file()
    
    if not settings_file:
        Colors.print("警告: 找不到 VSCode/Cursor 设置文件", Colors.YELLOW)
        print("\n请手动配置:")
        print("1. 打开设置 (Ctrl+, 或 Cmd+,)")
        print("2. 搜索 'Kiro Agent: Trusted Commands'")
        print("3. 点击 'Edit in settings.json'")
        print("4. 添加以下命令:\n")
        for cmd in commands:
            print(f'  "{cmd}",')
        print()
        sys.exit(1)
    
    Colors.print(f"找到设置文件: {settings_file}\n", Colors.GREEN)
    
    # 备份设置
    backup_file = backup_settings(settings_file)
    Colors.print(f"已备份原设置到: {backup_file}\n", Colors.GREEN)
    
    # 加载现有设置
    settings = load_settings(settings_file)
    
    # 检查是否已有配置
    property_name = 'kiro.agent.trustedCommands'
    
    if property_name in settings:
        Colors.print("检测到已有 Trusted Commands 配置\n", Colors.YELLOW)
        response = input("是否要合并配置？(y/n) ").strip().lower()
        
        if response == 'y':
            # 合并并去重
            existing = settings[property_name]
            all_commands = list(set(existing + commands))
            all_commands.sort()
            settings[property_name] = all_commands
            Colors.print("✓ 配置已合并", Colors.GREEN)
        else:
            print("已取消")
            sys.exit(0)
    else:
        # 添加新配置
        settings[property_name] = commands
        Colors.print("✓ 配置已添加", Colors.GREEN)
    
    # 保存设置
    save_settings(settings_file, settings)
    
    Colors.print("\n=== 导入完成 ===\n", Colors.GREEN)
    print(f"已导入 {len(commands)} 条命令\n")
    print("提示:")
    print("  - 重启 VSCode/Cursor 以使配置生效")
    print(f"  - 如有问题，可以从备份恢复: {backup_file}")
    print(f"  - 查看配置: {settings_file}")
    print()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n已取消")
        sys.exit(0)
    except Exception as e:
        Colors.print(f"\n错误: {e}", Colors.RED)
        sys.exit(1)
