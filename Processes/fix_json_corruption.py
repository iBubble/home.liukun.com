#!/usr/bin/env python3
"""
修复损坏的nodes.json文件
"""

import json
import sys
from datetime import datetime

data_file = '/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/data/nodes.json'

print("=" * 50)
print("修复 nodes.json 文件")
print("=" * 50)
print()

# 1. 备份原文件
backup_file = f"{data_file}.corrupt.{datetime.now().strftime('%Y%m%d%H%M%S')}"
print(f"1. 创建备份: {backup_file}")
with open(data_file, 'rb') as f:
    content = f.read()
with open(backup_file, 'wb') as f:
    f.write(content)
print(f"✓ 备份完成: {len(content)} bytes\n")

# 2. 尝试读取JSON
print("2. 分析JSON文件")
try:
    with open(data_file, 'r', encoding='utf-8') as f:
        nodes = json.load(f)
    print(f"✓ JSON格式正确")
    print(f"节点数量: {len(nodes)}")
    sys.exit(0)
except json.JSONDecodeError as e:
    print(f"✗ JSON格式错误: {e}")
    print(f"错误位置: 行{e.lineno} 列{e.colno}")
    print()

# 3. 尝试修复
print("3. 尝试修复JSON")

# 读取原始内容
with open(data_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找最后一个完整的节点对象
# 策略: 找到最后一个 "}," 或 "}" 后跟 "]" 的位置
print("查找最后一个有效的JSON结束位置...")

# 从后往前找第一个 "]"
last_bracket = content.rfind(']')
if last_bracket == -1:
    print("✗ 找不到结束括号")
    sys.exit(1)

print(f"找到结束括号位置: {last_bracket}")

# 尝试不同的截断点
for i in range(last_bracket, 0, -1):
    test_content = content[:i+1]
    try:
        nodes = json.loads(test_content)
        print(f"✓ 找到有效的JSON结束位置: {i}")
        print(f"节点数量: {len(nodes)}")
        
        # 4. 去重
        print("\n4. 去重处理")
        seen_hashes = set()
        unique_nodes = []
        duplicates = 0
        
        for node in nodes:
            node_hash = node.get('node_hash')
            if node_hash and node_hash not in seen_hashes:
                seen_hashes.add(node_hash)
                unique_nodes.append(node)
            else:
                duplicates += 1
        
        print(f"原始节点: {len(nodes)}")
        print(f"重复节点: {duplicates}")
        print(f"唯一节点: {len(unique_nodes)}")
        
        # 5. 写入修复后的文件
        print("\n5. 写入修复后的文件")
        fixed_content = json.dumps(unique_nodes, ensure_ascii=False, indent=4)
        
        with open(data_file, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print(f"✓ 写入成功: {len(fixed_content)} bytes")
        
        # 6. 验证
        print("\n6. 验证修复结果")
        with open(data_file, 'r', encoding='utf-8') as f:
            verify_nodes = json.load(f)
        
        print(f"✓ JSON格式正确")
        print(f"✓ 节点数量: {len(verify_nodes)}")
        
        print("\n" + "=" * 50)
        print("✓✓✓ 修复完成！")
        print("=" * 50)
        print(f"\n备份文件: {backup_file}")
        print(f"如需恢复: cp {backup_file} {data_file}")
        
        sys.exit(0)
        
    except json.JSONDecodeError:
        continue

print("✗ 无法修复JSON文件")
sys.exit(1)
