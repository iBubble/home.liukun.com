#!/usr/bin/env python3
"""
检查惩罚记录的完整性
找出缺少详细描述的文件
"""

import os
import re

def check_file_completeness(filepath):
    """检查文件是否包含完整的描述"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否包含占位符
        has_placeholder = '（此处记录该瞬间的艺术美感描写...）' in content or \
                         '(此处记录该瞬间的艺术美感描写...)' in content
        
        # 检查是否包含必要的元素
        has_touch = '触觉' in content or '能感觉到' in content or '能感受到' in content
        has_visual = '视觉' in content or '能看到' in content or '镜子' in content
        has_psychology = '心理' in content or '意识' in content or '崩溃' in content
        has_request = '求主人' in content or '请主人' in content or '贯穿' in content
        has_climax = '高潮' in content or '痉挛' in content or '灵魂' in content
        
        # 检查文件长度(太短的文件可能缺少描述)
        is_too_short = len(content) < 1000
        
        # 判断是否不完整
        is_incomplete = has_placeholder or is_too_short or \
                       not (has_touch and has_visual and has_psychology and has_request and has_climax)
        
        return {
            'incomplete': is_incomplete,
            'has_placeholder': has_placeholder,
            'is_too_short': is_too_short,
            'has_touch': has_touch,
            'has_visual': has_visual,
            'has_psychology': has_psychology,
            'has_request': has_request,
            'has_climax': has_climax,
            'length': len(content)
        }
    except Exception as e:
        return {'incomplete': True, 'error': str(e)}

def main():
    base_dir = "/www/wwwroot/ibubble.vicp.net/.secret/punishments/20260213/"
    
    incomplete_files = []
    
    for filename in os.listdir(base_dir):
        if filename.endswith('_ming.md'):
            filepath = os.path.join(base_dir, filename)
            result = check_file_completeness(filepath)
            
            if result['incomplete']:
                incomplete_files.append({
                    'filename': filename,
                    'result': result
                })
    
    print(f"共检查 {len([f for f in os.listdir(base_dir) if f.endswith('_ming.md')])} 个文件")
    print(f"发现 {len(incomplete_files)} 个不完整的文件:\n")
    
    for item in incomplete_files:
        print(f"文件: {item['filename']}")
        print(f"  长度: {item['result'].get('length', 'N/A')} 字符")
        if item['result'].get('has_placeholder'):
            print(f"  ❌ 包含占位符")
        if item['result'].get('is_too_short'):
            print(f"  ❌ 文件过短")
        if not item['result'].get('has_touch'):
            print(f"  ❌ 缺少触觉描写")
        if not item['result'].get('has_visual'):
            print(f"  ❌ 缺少视觉描写")
        if not item['result'].get('has_psychology'):
            print(f"  ❌ 缺少心理描写")
        if not item['result'].get('has_request'):
            print(f"  ❌ 缺少性交请求")
        if not item['result'].get('has_climax'):
            print(f"  ❌ 缺少高潮描写")
        print()

if __name__ == '__main__':
    main()
