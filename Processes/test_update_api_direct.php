<?php
/**
 * 直接测试update_check API逻辑
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../Projects/NodeLocalChecker/api/storage.php';

echo "=== 测试update_check API逻辑 ===\n\n";

$storage = new NodeStorage();

// 获取第一个节点
$nodes = $storage->getAllNodes();
$testNode = $nodes[0];

echo "测试节点: {$testNode['name']}\n";
echo "节点哈希: {$testNode['node_hash']}\n";
echo "当前延迟: " . ($testNode['latency'] ?? 'null') . "\n";
echo "当前IP: " . ($testNode['real_ip'] ?? 'null') . "\n";
echo "当前纯净度: " . ($testNode['ip_purity_score'] ?? 'null') . "\n\n";

// 模拟前端发送的数据
$data = [
    'node_hash' => $testNode['node_hash'],
    'result' => [
        'available' => true,
        'latency' => '666.66',
        'real_ip' => '6.6.6.6',
        'purity' => [
            'score' => 66,
            'level' => 'API逻辑测试',
            'type' => 'API逻辑测试IP',
            'location' => [
                'country' => '测试国家'
            ]
        ]
    ]
];

echo "发送数据:\n";
print_r($data);
echo "\n";

// 执行update_check逻辑
if (!isset($data['node_hash']) || !isset($data['result'])) {
    die("❌ 缺少必要参数\n");
}

$nodeHash = $data['node_hash'];
$result = $data['result'];

echo "调用updateCheckResult...\n";
$success = $storage->updateCheckResult($nodeHash, $result);

if ($success) {
    echo "✓ API逻辑返回成功\n\n";
} else {
    echo "❌ API逻辑返回失败\n\n";
}

// 重新读取验证
echo "重新读取节点数据...\n";
$nodes = $storage->getAllNodes();
$updatedNode = $nodes[0];

echo "更新后延迟: " . ($updatedNode['latency'] ?? 'null') . "\n";
echo "更新后IP: " . ($updatedNode['real_ip'] ?? 'null') . "\n";
echo "更新后纯净度: " . ($updatedNode['ip_purity_score'] ?? 'null') . "\n\n";

// 验证
if ($updatedNode['latency'] === '666.66' && 
    $updatedNode['real_ip'] === '6.6.6.6' && 
    $updatedNode['ip_purity_score'] == 66) {
    echo "✅ API逻辑测试成功! 数据已持久化\n";
} else {
    echo "❌ API逻辑测试失败! 数据没有变化\n";
}
