#!/bin/bash
# 完整的端到端测试：从解析 YAML 到检测节点

echo "================================"
echo "完整工作流测试"
echo "================================"
echo ""

YAML_FILE="yamls/config_clash_2026-02-04.yaml"

if [ ! -f "$YAML_FILE" ]; then
    echo "❌ 测试文件不存在: $YAML_FILE"
    exit 1
fi

echo "1. 测试 YAML 解析"
echo "文件: $YAML_FILE"
echo ""

# 创建临时 PHP 测试脚本
cat > /tmp/test_parse.php << 'EOF'
<?php
require_once __DIR__ . '/vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

$yamlFile = $argv[1];
$content = file_get_contents($yamlFile);
$config = Yaml::parse($content);

if (isset($config['proxies']) && is_array($config['proxies'])) {
    echo "✅ 成功解析 " . count($config['proxies']) . " 个节点\n\n";
    
    // 取前3个节点进行测试
    $testNodes = array_slice($config['proxies'], 0, 3);
    
    echo "准备测试以下节点:\n";
    foreach ($testNodes as $i => $node) {
        echo ($i + 1) . ". " . $node['name'] . " (" . $node['type'] . " - " . $node['server'] . ":" . $node['port'] . ")\n";
    }
    
    // 输出第一个节点的 JSON 用于测试
    echo "\n第一个节点 JSON:\n";
    echo json_encode($testNodes[0], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
} else {
    echo "❌ 解析失败\n";
    exit(1);
}
EOF

cd /www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker
php /tmp/test_parse.php "$YAML_FILE"

echo ""
echo "================================"
echo "2. 测试 Clash 检测（第一个节点）"
echo "================================"
echo ""

# 提取第一个节点并测试
FIRST_NODE=$(php -r "
require 'vendor/autoload.php';
use Symfony\Component\Yaml\Yaml;
\$config = Yaml::parse(file_get_contents('$YAML_FILE'));
if (isset(\$config['proxies'][0])) {
    echo json_encode(\$config['proxies'][0]);
}
")

if [ -z "$FIRST_NODE" ]; then
    echo "❌ 无法提取节点"
    exit 1
fi

echo "节点信息:"
echo "$FIRST_NODE" | python3 -m json.tool
echo ""

echo "开始 Clash 检测..."
CLASH_PATH="$(pwd)/bin/clash"
RESULT=$(python3 scripts/check_node_clash.py "$FIRST_NODE" "$CLASH_PATH" 2>&1)

echo "检测结果:"
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

echo ""
echo "================================"
echo "3. 测试 API 接口"
echo "================================"
echo ""

# 测试 check.php API
echo "测试 check.php API..."
TEMP_JSON=$(mktemp)
cat > "$TEMP_JSON" << EOF
{
    "node": $FIRST_NODE
}
EOF

curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @"$TEMP_JSON" \
    https://home.liukun.com:8443/Projects/NodeLocalChecker/api/check.php \
    | python3 -m json.tool 2>/dev/null || echo "API 调用失败"

rm -f "$TEMP_JSON"

echo ""
echo "================================"
echo "✅ 完整工作流测试完成"
echo "================================"
echo ""
echo "现在可以在浏览器中测试完整功能："
echo "https://home.liukun.com:8443/Projects/NodeLocalChecker/"
