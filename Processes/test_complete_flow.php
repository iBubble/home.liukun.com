<?php
/**
 * 完整流程测试：模拟检测并保存
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../Projects/NodeLocalChecker/api/storage.php';

echo "=== 完整流程测试 ===\n\n";

$storage = new NodeStorage();

// 1. 获取节点
echo "步骤1: 获取节点列表\n";
$nodes = $storage->getAllNodes();
echo "总节点数: " . count($nodes) . "\n\n";

if (count($nodes) < 5) {
    die("节点数量不足，无法测试\n");
}

// 2. 选择前5个节点进行测试
$testNodes = array_slice($nodes, 0, 5);
echo "步骤2: 选择前5个节点进行测试\n\n";

// 3. 模拟检测并保存
echo "步骤3: 模拟检测并保存\n";
$results = [
    ['available' => true, 'latency' => 100, 'real_ip' => '1.1.1.1', 'purity' => ['score' => 90, 'level' => '优秀', 'type' => 'residential']],
    ['available' => true, 'latency' => 200, 'real_ip' => '2.2.2.2', 'purity' => ['score' => 80, 'level' => '良好', 'type' => 'datacenter']],
    ['available' => false, 'latency' => null, 'real_ip' => null, 'purity' => null],
    ['available' => true, 'latency' => 150, 'real_ip' => '3.3.3.3', 'purity' => ['score' => 95, 'level' => '优秀', 'type' => 'residential']],
    ['available' => true, 'latency' => 300, 'real_ip' => '4.4.4.4', 'purity' => ['score' => 70, 'level' => '一般', 'type' => 'datacenter']],
];

$savedCount = 0;
$failedCount = 0;

foreach ($testNodes as $index => $node) {
    $result = $results[$index];
    $nodeHash = $node['node_hash'];
    $nodeName = $node['name'];
    
    echo "\n[$index] 节点: $nodeName\n";
    echo "    Hash: $nodeHash\n";
    echo "    结果: " . ($result['available'] ? "可用 ({$result['latency']}ms)" : "不可用") . "\n";
    
    $success = $storage->updateCheckResult($nodeHash, $result);
    
    if ($success) {
        echo "    ✓ 保存成功\n";
        $savedCount++;
    } else {
        echo "    ✗ 保存失败\n";
        $failedCount++;
    }
}

echo "\n步骤4: 验证保存结果\n";
echo "成功: $savedCount, 失败: $failedCount\n\n";

// 4. 重新读取验证
echo "步骤5: 重新读取数据库验证\n";
$nodes = $storage->getAllNodes();

$verifiedCount = 0;
foreach (array_slice($nodes, 0, 5) as $index => $node) {
    echo "\n[$index] 节点: {$node['name']}\n";
    echo "    可用性: " . ($node['available'] ?? 'null') . "\n";
    echo "    延迟: " . ($node['latency'] ?? 'null') . "\n";
    echo "    真实IP: " . ($node['real_ip'] ?? 'null') . "\n";
    echo "    纯净度: " . ($node['ip_purity_score'] ?? 'null') . "\n";
    echo "    检测时间: " . ($node['last_check_time'] ?? 'null') . "\n";
    
    if (isset($node['available']) && $node['available'] !== null) {
        $verifiedCount++;
    }
}

echo "\n=== 测试结果 ===\n";
echo "保存成功: $savedCount / 5\n";
echo "验证通过: $verifiedCount / 5\n";

if ($savedCount === 5 && $verifiedCount === 5) {
    echo "\n✓✓✓ 测试通过！保存功能正常工作！\n";
} else {
    echo "\n✗✗✗ 测试失败！保存功能有问题！\n";
}
