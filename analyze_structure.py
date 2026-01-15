#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""分析VideoEditor组件的div结构"""

import re

# 读取文件
with open('Projects/AIMovie/src/pages/VideoEditor/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到关键区域
stack = []
in_main_container = False
main_container_start = 0

for i, line in enumerate(lines, 1):
    # 检测主容器开始
    if 'mx-auto max-w-[1440px]' in line and '<div' in line:
        main_container_start = i
        in_main_container = True
        print(f"主容器开始: 第{i}行")
        print(f"  {line.strip()}")
        stack.append(('main', i))
        continue
    
    if not in_main_container:
        continue
    
    # 检测flex容器
    if 'flex flex-row flex-nowrap' in line and '<div' in line:
        print(f"\nflex容器开始: 第{i}行")
        print(f"  {line.strip()}")
        stack.append(('flex-row', i))
        continue
    
    # 检测素材库
    if 'w-64 flex-shrink-0' in line and '素材库' in lines[i] if i < len(lines) else False:
        print(f"\n素材库开始: 第{i}行")
        print(f"  {line.strip()}")
        stack.append(('assets', i))
        continue
    
    # 检测中间容器
    if 'flex flex-1 flex-col gap-6' in line and '<div' in line:
        print(f"\n中间容器开始: 第{i}行")
        print(f"  {line.strip()}")
        stack.append(('middle', i))
        continue
    
    # 检测特效面板
    if '特效面板' in line or ('特效' in line and 'h2' in line):
        print(f"\n特效面板位置: 第{i}行")
        print(f"  {line.strip()}")
        # 往前找div开始标签
        for j in range(i-1, max(0, i-5), -1):
            if '<div' in lines[j] and 'w-64' in lines[j]:
                print(f"  特效面板div开始: 第{j+1}行")
                print(f"    {lines[j].strip()}")
                break
        continue
    
    # 检测时间线
    if '时间线' in line and 'h3' in line:
        print(f"\n时间线标题: 第{i}行")
        print(f"  {line.strip()}")
        continue

# 现在分析第850-870行的闭合标签
print("\n\n=== 分析第850-870行的闭合标签 ===")
for i in range(849, min(870, len(lines))):
    line = lines[i]
    if '</div>' in line:
        indent = len(line) - len(line.lstrip())
        print(f"第{i+1}行 (缩进{indent}): {line.rstrip()}")
