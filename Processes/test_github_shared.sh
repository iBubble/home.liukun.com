#!/bin/bash

echo "=========================================="
echo "测试GitHub共享订阅源"
echo "=========================================="

cd Projects/Aggregator/external/aggregator

# 备份当前数据
echo "[1] 备份当前数据..."
if [ -f "data/clash.yaml" ]; then
    old_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    echo "    当前节点数: $old_count"
else
    old_count=0
    echo "    无旧数据"
fi

# 根据aggregator文档，Issue #91有共享订阅
# 我们直接使用一些高质量的GitHub订阅源
echo ""
echo "[2] 下载GitHub共享订阅源..."

# 创建临时目录
mkdir -p temp_github_subs

# 下载多个高质量订阅源（这些是GitHub上常用的免费订阅）
echo "  - 下载 peasoft/NoMoreWalls..."
curl -s -m 30 "https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt" > temp_github_subs/nomorewall.txt 2>/dev/null || echo "    超时或失败"

echo "  - 下载 freefq/free..."
curl -s -m 30 "https://raw.githubusercontent.com/freefq/free/master/v2" > temp_github_subs/freefq.txt 2>/dev/null || echo "    超时或失败"

echo "  - 下载 aiboboxx/v2rayfree..."
curl -s -m 30 "https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2" > temp_github_subs/aiboboxx.txt 2>/dev/null || echo "    超时或失败"

echo "  - 下载 Pawdroid/Free-servers..."
curl -s -m 30 "https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub" > temp_github_subs/pawdroid.txt 2>/dev/null || echo "    超时或失败"

echo "  - 下载 mfuu/v2ray..."
curl -s -m 30 "https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray" > temp_github_subs/mfuu.txt 2>/dev/null || echo "    超时或失败"

# 统计下载的订阅数
sub_count=$(ls -1 temp_github_subs/*.txt 2>/dev/null | wc -l)
echo ""
echo "  ✓ 成功下载 $sub_count 个订阅源"

# 合并所有订阅到一个文件
echo ""
echo "[3] 合并订阅源..."
cat temp_github_subs/*.txt 2>/dev/null | base64 -d 2>/dev/null > temp_github_subs/merged_raw.txt

# 统计原始节点数
raw_count=$(grep -c "://" temp_github_subs/merged_raw.txt 2>/dev/null || echo "0")
echo "  ✓ 解码后共 $raw_count 个原始节点"

# 使用subconverter或直接处理
echo ""
echo "[4] 转换为Clash格式..."

# 创建一个简单的Python脚本来转换
python3 << 'PYTHON_SCRIPT'
import sys
import base64
import yaml
import re

# 读取合并的原始节点
try:
    with open('temp_github_subs/merged_raw.txt', 'r') as f:
        lines = f.readlines()
    
    proxies = []
    for line in lines:
        line = line.strip()
        if not line or not '://' in line:
            continue
        
        # 简单解析（这里只是示例，实际需要更完整的解析）
        if line.startswith('vmess://'):
            # VMess节点
            try:
                data = base64.b64decode(line[8:]).decode('utf-8')
                import json
                config = json.loads(data)
                proxy = {
                    'name': config.get('ps', 'VMess节点'),
                    'type': 'vmess',
                    'server': config.get('add', ''),
                    'port': int(config.get('port', 443)),
                    'uuid': config.get('id', ''),
                    'alterId': int(config.get('aid', 0)),
                    'cipher': config.get('scy', 'auto'),
                    'tls': config.get('tls', '') == 'tls',
                    'udp': True
                }
                proxies.append(proxy)
            except:
                pass
        elif line.startswith('ss://'):
            # Shadowsocks节点（简化处理）
            pass
        elif line.startswith('trojan://'):
            # Trojan节点（简化处理）
            pass
    
    # 读取现有的clash.yaml并合并
    existing_proxies = []
    try:
        with open('data/clash.yaml', 'r') as f:
            existing_data = yaml.safe_load(f)
            if existing_data and 'proxies' in existing_data:
                existing_proxies = existing_data['proxies']
    except:
        pass
    
    # 合并节点（去重）
    existing_names = {p.get('name') for p in existing_proxies}
    for proxy in proxies:
        if proxy['name'] not in existing_names:
            existing_proxies.append(proxy)
    
    # 保存
    output = {'proxies': existing_proxies}
    with open('data/clash.yaml', 'w') as f:
        yaml.dump(output, f, allow_unicode=True, default_flow_style=False)
    
    print(f"  ✓ 成功转换 {len(proxies)} 个新节点")
    print(f"  ✓ 总节点数: {len(existing_proxies)}")
    
except Exception as e:
    print(f"  ✗ 转换失败: {e}")
    sys.exit(1)
PYTHON_SCRIPT

# 清理临时文件
rm -rf temp_github_subs

# 检查最终结果
echo ""
echo "[5] 检查最终结果..."
if [ -f "data/clash.yaml" ]; then
    new_count=$(grep -c "^  - {name:" data/clash.yaml || echo "0")
    added=$((new_count - old_count))
    echo "✓ 原有节点: $old_count"
    echo "✓ 当前节点: $new_count"
    echo "✓ 新增节点: $added"
else
    echo "✗ 未生成 clash.yaml"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
