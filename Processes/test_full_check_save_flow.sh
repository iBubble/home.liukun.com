#!/bin/bash

echo "=== 完整检测和保存流程测试 ==="
echo ""

# 1. 检查数据库初始状态
echo "步骤1: 检查数据库初始状态"
php -r "
\$data = json_decode(file_get_contents('Projects/NodeLocalChecker/data/nodes.json'), true);
echo '总节点数: ' . count(\$data) . PHP_EOL;
\$checked = 0;
foreach (\$data as \$node) {
    if (isset(\$node['available']) && \$node['available'] !== null) {
        \$checked++;
    }
}
echo '已检测节点数: ' . \$checked . PHP_EOL;
"
echo ""

# 2. 模拟检测并保存（使用PHP直接调用）
echo "步骤2: 模拟检测并保存5个节点"
php Processes/test_complete_flow.php | grep -E "(节点:|保存|测试结果)"
echo ""

# 3. 验证保存结果
echo "步骤3: 验证保存结果"
php -r "
\$data = json_decode(file_get_contents('Projects/NodeLocalChecker/data/nodes.json'), true);
\$checked = 0;
\$available = 0;
foreach (\$data as \$node) {
    if (isset(\$node['available']) && \$node['available'] !== null) {
        \$checked++;
        if (\$node['available'] === 1) \$available++;
    }
}
echo '已检测节点数: ' . \$checked . PHP_EOL;
echo '可用节点数: ' . \$available . PHP_EOL;
"
echo ""

# 4. 测试前端加载
echo "步骤4: 测试前端API加载"
curl -s "http://localhost/Projects/NodeLocalChecker/api/nodes.php?action=list" | php -r "
\$json = json_decode(file_get_contents('php://stdin'), true);
if (\$json['success']) {
    echo '✓ API返回成功' . PHP_EOL;
    echo '节点数量: ' . count(\$json['nodes']) . PHP_EOL;
    \$checked = 0;
    foreach (\$json['nodes'] as \$node) {
        if (isset(\$node['available']) && \$node['available'] !== null) {
            \$checked++;
        }
    }
    echo '已检测节点数: ' . \$checked . PHP_EOL;
} else {
    echo '✗ API返回失败' . PHP_EOL;
}
"
echo ""

echo "=== 测试完成 ==="
echo ""
echo "如果已检测节点数 >= 5，说明保存功能正常"
echo "请刷新浏览器页面验证数据是否显示"
