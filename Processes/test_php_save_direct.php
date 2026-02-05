<?php
/**
 * 直接测试PHP保存功能
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../Projects/NodeLocalChecker/api/storage.php';

echo "========== 测试PHP保存功能 ==========\n\n";

$storage = new NodeStorage();

// 1. 获取所有节点
echo "1. 获取所有节点...\n";
$nodes = $storage->getAllNodes();
echo "节点总数: " . count($nodes) . "\n\n";

// 2. 找一个未检测的节点
echo "2. 查找未检测的节点...\n";
$uncheckedNode = null;
foreach ($nodes as $node) {
    if ($node['available'] === null) {
        $uncheckedNode = $node;
        break;
    }
}

if (!$uncheckedNode) {
    echo "没有未检测的节点，使用第一个节点\n";
    $uncheckedNode = $nodes[0];
}

echo "选择节点: " . $uncheckedNode['name'] . "\n";
echo "节点哈希: " . $uncheckedNode['node_hash'] . "\n\n";

// 3. 准备测试数据
echo "3. 准备测试数据...\n";
$testResult = [
    'available' => false,
    'latency' => '999ms',
    'real_ip' => '1.2.3.4',
    'purity' => [
        'score' => 88,
        'level' => '良好',
        'type' => '测试'
    ]
];

echo "测试数据:\n";
echo json_encode($testResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 4. 执行保存
echo "4. 执行保存...\n";
$success = $storage->updateCheckResult($uncheckedNode['node_hash'], $testResult);

if ($success) {
    echo "✓ 保存成功\n\n";
} else {
    echo "✗ 保存失败\n\n";
    exit(1);
}

// 5. 验证保存结果
echo "5. 验证保存结果...\n";
sleep(1);
$nodes = $storage->getAllNodes();
$savedNode = null;
foreach ($nodes as $node) {
    if ($node['node_hash'] === $uncheckedNode['node_hash']) {
        $savedNode = $node;
        break;
    }
}

if (!$savedNode) {
    echo "✗ 未找到保存的节点\n";
    exit(1);
}

echo "保存后的节点数据:\n";
echo json_encode([
    'name' => $savedNode['name'],
    'available' => $savedNode['available'],
    'latency' => $savedNode['latency'],
    'real_ip' => $savedNode['real_ip'],
    'ip_purity_score' => $savedNode['ip_purity_score'],
    'last_check_time' => $savedNode['last_check_time']
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 6. 验证数据
echo "6. 验证数据...\n";
$errors = [];

if ($savedNode['available'] !== 0) {
    $errors[] = "available 不匹配: 期望 0, 实际 " . $savedNode['available'];
}

if ($savedNode['latency'] !== '999ms') {
    $errors[] = "latency 不匹配: 期望 999ms, 实际 " . $savedNode['latency'];
}

if ($savedNode['real_ip'] !== '1.2.3.4') {
    $errors[] = "real_ip 不匹配: 期望 1.2.3.4, 实际 " . $savedNode['real_ip'];
}

if ($savedNode['ip_purity_score'] !== 88) {
    $errors[] = "ip_purity_score 不匹配: 期望 88, 实际 " . $savedNode['ip_purity_score'];
}

if (empty($savedNode['last_check_time'])) {
    $errors[] = "last_check_time 为空";
}

if (empty($errors)) {
    echo "✓✓✓ 所有数据验证通过！\n";
} else {
    echo "✗✗✗ 数据验证失败:\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
    exit(1);
}

echo "\n========== 测试完成 ==========\n";
