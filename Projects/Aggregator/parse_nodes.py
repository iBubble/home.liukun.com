#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import yaml
import sys
import os

def should_filter_node(name):
    """判断节点是否应该被过滤掉 - 只过滤明显无效的节点"""
    # 极简过滤列表 - 只过滤真正无效的节点（邮箱、故障报修、流量信息等）
    # 不过滤包含提示信息的正常节点
    filter_keywords = [
        '邮箱', 'email', '@gmail', '@qq',
        '故障报修', '报修邮箱',
        '剩余流量', '距离下次重置',
        '套餐到期：', '到期：',  # 只过滤明确的到期信息节点
        '长期有效',
    ]
    
    # 检查是否包含过滤关键词
    name_lower = name.lower()
    for keyword in filter_keywords:
        if keyword.lower() in name_lower:
            return True
    
    return False

def extract_location(name):
    """从节点名称提取位置信息"""
    patterns = {
        '美国': ['🇺🇸', '美国', 'US', 'USA'],
        '日本': ['🇯🇵', '日本', 'JP', 'Japan'],
        '香港': ['🇭🇰', '香港', 'HK', 'Hong Kong'],
        '新加坡': ['🇸🇬', '新加坡', 'SG', 'Singapore'],
        '韩国': ['🇰🇷', '韩国', 'KR', 'Korea'],
        '英国': ['🇬🇧', '英国', 'UK', 'Britain'],
        '德国': ['🇩🇪', '德国', 'DE', 'Germany'],
        '法国': ['🇫🇷', '法国', 'FR', 'France'],
        '加拿大': ['🇨🇦', '加拿大', 'CA', 'Canada'],
        '澳洲': ['🇦🇺', '澳洲', 'AU', 'Australia'],
        '印度': ['🇮🇳', '印度', 'IN', 'India'],
        '台湾': ['🇹🇼', '台湾', 'TW', 'Taiwan'],
    }
    
    for location, keywords in patterns.items():
        for keyword in keywords:
            if keyword in name:
                return location
    
    return '未知'

def main():
    # 获取脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 优先从 aggregator 目录读取实时数据
    yaml_files = [
        os.path.join(script_dir, 'external/aggregator/data/clash.yaml'),
        os.path.join(script_dir, 'data/clash.yaml')
    ]
    
    yaml_file = None
    for f in yaml_files:
        if os.path.exists(f):
            yaml_file = f
            break
    
    if not yaml_file:
        print("错误: 未找到 clash.yaml 文件")
        sys.exit(1)
    
    json_file = os.path.join(script_dir, 'data/nodes.json')
    
    try:
        print(f"正在读取: {yaml_file}")
        
        # 读取 YAML 文件
        with open(yaml_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        if not data or 'proxies' not in data:
            print("错误: YAML 文件格式不正确")
            sys.exit(1)
        
        # 读取现有的节点数据（如果存在）
        existing_nodes = {}
        if os.path.exists(json_file):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                    if isinstance(existing_data, list):
                        # 将现有节点转换为字典，以节点名称为key
                        for node in existing_data:
                            if 'name' in node:
                                existing_nodes[node['name']] = node
            except:
                pass
        
        # 转换节点格式，合并新旧数据
        nodes = {}
        filtered_count = 0
        for proxy in data['proxies']:
            node_name = proxy.get('name', '未命名')
            
            # 过滤无效节点
            if should_filter_node(node_name):
                filtered_count += 1
                continue
            
            node = {
                'name': node_name,
                'type': proxy.get('type', 'unknown'),
                'server': proxy.get('server', ''),
                'port': str(proxy.get('port', '')),
                'location': extract_location(node_name),
                'status': 'unknown',
                'delay': None
            }
            
            # 如果节点已存在，保留其delay和status信息
            if node_name in existing_nodes:
                node['delay'] = existing_nodes[node_name].get('delay')
                node['status'] = existing_nodes[node_name].get('status', 'unknown')
            
            nodes[node_name] = node
        
        # 转换为列表
        nodes_list = list(nodes.values())
        
        # 使用原子写入方式保存 JSON（先写临时文件，再重命名）
        temp_file = json_file + '.tmp'
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(nodes_list, f, ensure_ascii=False, indent=2)
        
        # 原子性地替换文件
        os.replace(temp_file, json_file)
        
        # 修复文件权限，确保PHP-FPM（www用户）可以读写
        try:
            import subprocess
            subprocess.run(['sudo', 'chown', 'www:www', json_file], check=False, capture_output=True)
            subprocess.run(['sudo', 'chmod', '666', json_file], check=False, capture_output=True)
        except Exception as e:
            print(f"⚠️  权限修复失败: {e}")
        
        print(f"✅ 成功解析 {len(nodes_list)} 个有效节点")
        if filtered_count > 0:
            print(f"🚫 已过滤 {filtered_count} 个无效节点")
        print(f"📁 已保存到: {json_file}")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
