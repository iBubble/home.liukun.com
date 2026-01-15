#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('Projects/AIMovie/src/pages/VideoEditor/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 检查关键行的缩进
check_lines = [607, 680, 682, 858, 861]

for line_num in check_lines:
    line = lines[line_num - 1]
    indent = len(line) - len(line.lstrip())
    print(f"第{line_num}行 (缩进{indent}): {line.strip()[:80]}")
