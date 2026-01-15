#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证div结构的正确性"""

with open('Projects/AIMovie/src/pages/VideoEditor/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 追踪关键div
stack = []
indent_stack = []

for i in range(603, min(915, len(lines))):
    line = lines[i]
    line_num = i + 1
    indent = len(line) - len(line.lstrip())
    
    # 检测开始标签
    if '<div' in line and not line.strip().startswith('//'):
        # 提取className
        import re
        match = re.search(r'className="([^"]*)"', line)
        class_name = match.group(1) if match else "no-class"
        
        # 关键div
        if 'max-w-[1440px]' in class_name:
            print(f"第{line_num}行 (缩进{indent}): 主容器开始")
            stack.append(('main', line_num, indent))
        elif 'flex-row flex-nowrap' in class_name:
            print(f"第{line_num}行 (缩进{indent}): flex容器开始")
            stack.append(('flex-row', line_num, indent))
        elif 'w-64' in class_name and line_num < 680:
            print(f"第{line_num}行 (缩进{indent}): 素材库开始")
            stack.append(('assets', line_num, indent))
        elif 'flex flex-1 flex-col gap-6' in class_name:
            print(f"第{line_num}行 (缩进{indent}): 中间容器开始")
            stack.append(('middle', line_num, indent))
        elif 'w-64' in class_name and line_num > 850:
            print(f"第{line_num}行 (缩进{indent}): 特效面板开始")
            stack.append(('effects', line_num, indent))
    
    # 检测闭合标签
    if '</div>' in line and line_num >= 850 and line_num <= 915:
        print(f"第{line_num}行 (缩进{indent}): 闭合标签")
        
        # 尝试匹配
        if stack:
            # 找到最近的匹配缩进的开始标签
            for j in range(len(stack) - 1, -1, -1):
                name, start_line, start_indent = stack[j]
                if start_indent == indent:
                    print(f"  -> 关闭: {name} (第{start_line}行)")
                    if line_num == 858:
                        print(f"  *** 第858行关闭的是: {name} ***")
                    stack.pop(j)
                    break

print("\n剩余未关闭的div:")
for name, line_num, indent in stack:
    print(f"  {name} (第{line_num}行, 缩进{indent})")
