#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('Projects/AIMovie/src/pages/VideoEditor/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 从第607行开始,找到缩进为10的</div>
print("素材库开始: 第607行 (缩进10)")
print()

for i in range(607, 682):
    line = lines[i]
    indent = len(line) - len(line.lstrip())
    
    if '</div>' in line:
        print(f"第{i+1}行 (缩进{indent}): {line.strip()}")
        if indent == 10:
            print(f"  ^^^ 这个可能是素材库的闭合标签!")
