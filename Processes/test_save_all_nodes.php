<?php
/**
 * 测试批量保存节点检测结果
 */

require_once __DIR__ . '/../Projects/NodeLocalChecker/api/storage.php';

echo "=== 测试批量保存节点检测结果 ===\n\n";

$storage = new NodeStorage();

// 获取所有节点
$nodes = $storage->getAllNodes();
echo "总节点数: " . count($nodes) . "\n\n";

// 模拟检测结果
$testResults = [
    [
        'available' => true,
        'latency' => 123,
        'real_ip' => '1.2.3.4',
        'purity' => [
            'score' => 85,
            'level' => '良好',
            'type' => 'datacenter'
        ]
    ],
    [
        'available' => true,
        'latency' => 456,
        'real_ip' => '5.6.7.8',
        'purity' => [
            'score' => 92,
            'level' => '优秀',
            'type' => 'residential'
        ]
    ],
    [
        'available' => false,
        'latency' => null,
        'real_ip' => null,
        'purity' => null
    ]
];

// 测试保存前3个节点
$testCount = min(3, count($nodes));
echo "测试保存前 $testCount 个节点...\n\n";

for ($i = 0; $i < $testCount; $i++) {
    $node = $nodes[$i];
    $result = $testResults[$i % count($testResults)];
    
    echo "[$i] 节点: {$node['name']}\n";
    echo "    Hash: {$node['node_hash']}\n";
    echo "    结果: " . ($result['available'] ? '可用' : '不可用') . "\n";
    
    $success = $storage->updateCheckResult($node['node_hash'], $result);
    
    if ($success) {
        echo "    ✓ 保存成功\n";
    } else {
        echo "    ✗ 保存失败\n";
    }
    
    echo "\n";
}

// 重新读取验证
echo "=== 验证保存结果 ===\n\n";
$nodes = $storage->getAllNodes();

for ($i = 0; $i < $testCount; $i++) {
    $node = $nodes[$i];
    
    echo "[$i] 节点: {$node['name']}\n";
    echo "    可用性: " . ($node['available'] ?? 'null') . "\n";
    echo "    延迟: " . ($node['latency'] ?? 'null') . "\n";
    echo "    真实IP: " . ($node['real_ip'] ?? 'null') . "\n";
    echo "    纯净度: " . ($node['ip_purity_score'] ?? 'null') . "\n";
    echo "    检测时间: " . ($node['last_check_time'] ?? 'null') . "\n";
    echo "\n";
}

echo "✓ 测试完成\n";
