#!/bin/bash
# 等待扫描完成并检查结果

echo "=== 等待扫描完成 ==="
echo "开始时间: $(date '+%H:%M:%S')"
echo ""

# 等待最多 3 分钟
for i in {1..36}; do
    # 检查是否有 "All artifact generated" 标记
    if grep -q "All artifact generated" Projects/Aggregator/logs/real_scan.log 2>/dev/null; then
        echo "✓ 扫描完成！"
        break
    fi
    
    # 显示进度
    echo -n "."
    sleep 5
done

echo ""
echo "结束时间: $(date '+%H:%M:%S')"
echo ""

# 显示最后的日志
echo "=== 扫描日志（最后30行）==="
tail -30 Projects/Aggregator/logs/real_scan.log
echo ""

# 检查节点数量
echo "=== 节点统计 ==="
if [ -f Projects/Aggregator/data/nodes.json ]; then
    node_count=$(python3 -c "import json; data=json.load(open('Projects/Aggregator/data/nodes.json')); print(len(data))")
    echo "有效节点数: $node_count"
    
    if [ $node_count -gt 0 ]; then
        echo ""
        echo "节点来源分布:"
        python3 -c "
import json
data = json.load(open('Projects/Aggregator/data/nodes.json'))
sources = {}
for node in data:
    name = node.get('name', '')
    # 简单提取来源
    if '|' in name:
        source = name.split('|')[0].strip()
    else:
        source = '未知'
    sources[source] = sources.get(source, 0) + 1

for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f'  {source}: {count}')
"
    fi
else
    echo "节点文件不存在"
fi
