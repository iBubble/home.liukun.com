<?php
/**
 * 测试检测结果保存功能
 */

require_once __DIR__ . '/../Projects/NodeLocalChecker/api/storage.php';

echo "=== 测试检测结果保存功能 ===\n\n";

$storage = new NodeStorage();

// 1. 获取第一个节点
$nodes = $storage->getAllNodes();
if (empty($nodes)) {
    die("错误: 没有节点数据\n");
}

$testNode = $nodes[0];
echo "测试节点: {$testNode['name']}\n";
echo "节点哈希: {$testNode['node_hash']}\n\n";

// 2. 模拟检测结果
$testResult = [
    'available' => true,
    'latency' => '123.45',
    'real_ip' => '1.2.3.4',
    'purity' => [
        'score' => 95,
        'level' => '优秀',
        'type' => '住宅IP',
        'location' => [
            'country' => '美国',
            'city' => '洛杉矶'
        ]
    ]
];

echo "模拟检测结果:\n";
print_r($testResult);
echo "\n";

// 3. 保存检测结果
echo "保存检测结果...\n";
$success = $storage->updateCheckResult($testNode['node_hash'], $testResult);

if ($success) {
    echo "✅ 保存成功\n\n";
    
    // 4. 重新读取节点,验证保存
    $nodes = $storage->getAllNodes();
    $updatedNode = null;
    foreach ($nodes as $node) {
        if ($node['node_hash'] === $testNode['node_hash']) {
            $updatedNode = $node;
            break;
        }
    }
    
    if ($updatedNode) {
        echo "更新后的节点数据:\n";
        echo "- available: " . ($updatedNode['available'] ?? 'null') . "\n";
        echo "- latency: " . ($updatedNode['latency'] ?? 'null') . "\n";
        echo "- real_ip: " . ($updatedNode['real_ip'] ?? 'null') . "\n";
        echo "- ip_purity_score: " . ($updatedNode['ip_purity_score'] ?? 'null') . "\n";
        echo "- purity: " . json_encode($updatedNode['purity'] ?? null, JSON_UNESCAPED_UNICODE) . "\n";
        echo "- last_check_time: " . ($updatedNode['last_check_time'] ?? 'null') . "\n";
        
        // 验证字段
        echo "\n验证结果:\n";
        $checks = [
            'available字段' => $updatedNode['available'] === 1,
            'latency字段' => $updatedNode['latency'] === '123.45',
            'real_ip字段' => $updatedNode['real_ip'] === '1.2.3.4',
            'ip_purity_score字段' => $updatedNode['ip_purity_score'] === 95,
            'purity对象' => isset($updatedNode['purity']['score']) && $updatedNode['purity']['score'] === 95
        ];
        
        foreach ($checks as $name => $result) {
            echo ($result ? '✅' : '❌') . " {$name}\n";
        }
    } else {
        echo "❌ 未找到更新后的节点\n";
    }
} else {
    echo "❌ 保存失败\n";
}

echo "\n=== 测试完成 ===\n";
