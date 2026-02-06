<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../Projects/NodeLocalChecker/api/storage.php';

echo "=== 直接测试updateCheckResult方法 ===\n\n";

$storage = new NodeStorage();

// 获取第一个节点
$nodes = $storage->getAllNodes();
$testNode = $nodes[0];

echo "测试节点: {$testNode['name']}\n";
echo "节点哈希: {$testNode['node_hash']}\n";
echo "当前延迟: " . ($testNode['latency'] ?? 'null') . "\n";
echo "当前IP: " . ($testNode['real_ip'] ?? 'null') . "\n\n";

// 准备测试数据
$testResult = [
    'available' => true,
    'latency' => '999.99',
    'real_ip' => '9.9.9.9',
    'purity' => [
        'score' => 99,
        'level' => '测试',
        'type' => '测试IP'
    ]
];

echo "测试数据:\n";
print_r($testResult);
echo "\n";

// 调用updateCheckResult
echo "调用updateCheckResult...\n";
$result = $storage->updateCheckResult($testNode['node_hash'], $testResult);
echo "返回结果: " . ($result ? '成功' : '失败') . "\n\n";

// 重新读取验证
echo "重新读取节点数据...\n";
$nodes = $storage->getAllNodes();
$updatedNode = $nodes[0];

echo "更新后延迟: " . ($updatedNode['latency'] ?? 'null') . "\n";
echo "更新后IP: " . ($updatedNode['real_ip'] ?? 'null') . "\n";
echo "更新后纯净度: " . ($updatedNode['ip_purity_score'] ?? 'null') . "\n";

// 验证
if ($updatedNode['latency'] === '999.99' && $updatedNode['real_ip'] === '9.9.9.9') {
    echo "\n✅ 更新成功!\n";
} else {
    echo "\n❌ 更新失败! 数据没有变化\n";
}
