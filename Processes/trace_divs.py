#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""追踪关键div的开始和结束"""

import re

with open('Projects/AIMovie/src/pages/VideoEditor/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 关键标记
markers = {
    604: "主容器开始",
    605: "flex容器开始", 
    607: "素材库开始",
    682: "中间容器开始",
    861: "特效面板开始"
}

# 计算每行的div平衡
balance = 0
div_stack = []

for i in range(603, min(915, len(lines))):
    line = lines[i]
    line_num = i + 1
    
    # 计算这一行的div变化
    opens = line.count('<div')
    closes = line.count('</div>')
    
    if line_num in markers:
        print(f"\n第{line_num}行: {markers[line_num]}")
        print(f"  {line.strip()[:100]}")
        print(f"  当前平衡: {balance}, 本行: +{opens} -{closes}")
        div_stack.append((line_num, markers[line_num], balance))
    
    balance += opens - closes
    
    # 检测重要的闭合标签
    if closes > 0 and line_num >= 850 and line_num <= 915:
        indent = len(line) - len(line.lstrip())
        print(f"第{line_num}行 (缩进{indent}, 平衡{balance}): {line.strip()}")
        
        # 尝试匹配这个闭合标签对应哪个开始标签
        if div_stack:
            # 简单匹配:根据缩进推测
            for start_line, name, start_balance in reversed(div_stack):
                if balance <= start_balance:
                    print(f"  -> 可能关闭: {name} (第{start_line}行)")
                    break

print(f"\n最终平衡: {balance} (应该为0)")
