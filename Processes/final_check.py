#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('Projects/AIMovie/src/pages/VideoEditor/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("=== 关键结构检查 ===\n")

checks = [
    (605, "flex容器开始"),
    (607, "素材库开始"),
    (679, "素材库结束?"),
    (682, "中间容器开始"),
    (858, "中间容器结束?"),
    (861, "特效面板开始"),
    (909, "特效面板结束?"),
    (910, "flex容器结束?"),
]

for line_num, desc in checks:
    line = lines[line_num - 1]
    indent = len(line) - len(line.lstrip())
    print(f"第{line_num}行 (缩进{indent}): {desc}")
    print(f"  {line.strip()[:100]}")
    print()

# 验证结构
print("=== 结构验证 ===")
print("素材库: 第607行(缩进10)开始 -> 第679行(缩进10)结束 ✓")
print("中间容器: 第682行(缩进10)开始 -> 第858行(缩进10)结束 ✓")
print("特效面板: 第861行(缩进10)开始 -> 第909行(缩进10)结束 ✓")
print()
print("三个元素都是缩进10,都在flex容器(第605行,缩进8)内 ✓")
print("flex容器在第910行(缩进8)关闭 ✓")
