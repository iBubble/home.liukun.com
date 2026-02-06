<?php
/**
 * 测试API的update_check接口
 * 模拟前端的fetch调用
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== 测试API update_check接口 ===\n\n";

// 1. 先获取一个节点
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/Projects/NodeLocalChecker/api/nodes.php?action=list');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if (!$result['success'] || empty($result['nodes'])) {
    die("❌ 无法获取节点列表\n");
}

$testNode = $result['nodes'][0];
echo "测试节点: {$testNode['name']}\n";
echo "节点哈希: {$testNode['node_hash']}\n";
echo "当前延迟: " . ($testNode['latency'] ?? 'null') . "\n";
echo "当前IP: " . ($testNode['real_ip'] ?? 'null') . "\n";
echo "当前纯净度: " . ($testNode['ip_purity_score'] ?? 'null') . "\n\n";

// 2. 准备测试数据 - 完全模拟前端的数据格式
$testData = [
    'node_hash' => $testNode['node_hash'],
    'result' => [
        'available' => true,
        'latency' => '888.88',
        'real_ip' => '8.8.8.8',
        'purity' => [
            'score' => 88,
            'level' => 'API测试',
            'type' => 'API测试IP',
            'location' => [
                'country' => '测试国家'
            ]
        ]
    ]
];

echo "发送数据:\n";
echo json_encode($testData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 3. 调用API
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/Projects/NodeLocalChecker/api/nodes.php?action=update_check');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP状态码: $httpCode\n";
echo "API响应: $response\n\n";

$apiResult = json_decode($response, true);
if (!$apiResult) {
    die("❌ API返回的不是有效的JSON\n");
}

if (!$apiResult['success']) {
    die("❌ API返回失败: " . ($apiResult['error'] ?? $apiResult['message']) . "\n");
}

echo "✓ API返回成功\n\n";

// 4. 重新读取验证
sleep(1); // 等待1秒确保文件写入完成

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/Projects/NodeLocalChecker/api/nodes.php?action=list');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
$updatedNode = $result['nodes'][0];

echo "验证更新结果:\n";
echo "更新后延迟: " . ($updatedNode['latency'] ?? 'null') . "\n";
echo "更新后IP: " . ($updatedNode['real_ip'] ?? 'null') . "\n";
echo "更新后纯净度: " . ($updatedNode['ip_purity_score'] ?? 'null') . "\n\n";

// 5. 判断结果
if ($updatedNode['latency'] === '888.88' && 
    $updatedNode['real_ip'] === '8.8.8.8' && 
    $updatedNode['ip_purity_score'] == 88) {
    echo "✅ API更新成功! 数据已持久化\n";
} else {
    echo "❌ API更新失败! 数据没有变化\n";
    echo "\n期望值:\n";
    echo "  延迟: 888.88\n";
    echo "  IP: 8.8.8.8\n";
    echo "  纯净度: 88\n";
    echo "\n实际值:\n";
    echo "  延迟: " . ($updatedNode['latency'] ?? 'null') . "\n";
    echo "  IP: " . ($updatedNode['real_ip'] ?? 'null') . "\n";
    echo "  纯净度: " . ($updatedNode['ip_purity_score'] ?? 'null') . "\n";
}
