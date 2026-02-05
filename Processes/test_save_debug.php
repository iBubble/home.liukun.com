#!/usr/bin/env php
<?php
/**
 * 调试节点保存失败问题
 */

// 启用错误报告
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php_save_debug.log');

echo "========================================\n";
echo "节点保存调试测试\n";
echo "========================================\n\n";

// 1. 检查文件权限
echo "1. 检查文件权限\n";
$dataFile = '/www/wwwroot/ibubble.vicp.net/Projects/NodeLocalChecker/data/nodes.json';
$dataDir = dirname($dataFile);

echo "数据目录: $dataDir\n";
echo "数据文件: $dataFile\n";

if (!is_dir($dataDir)) {
    echo "✗ 数据目录不存在\n";
    exit(1);
}

if (!is_writable($dataDir)) {
    echo "✗ 数据目录不可写\n";
    echo "权限: " . substr(sprintf('%o', fileperms($dataDir)), -4) . "\n";
    exit(1);
}
echo "✓ 数据目录可写\n";

if (!file_exists($dataFile)) {
    echo "✗ 数据文件不存在\n";
    exit(1);
}

if (!is_writable($dataFile)) {
    echo "✗ 数据文件不可写\n";
    echo "权限: " . substr(sprintf('%o', fileperms($dataFile)), -4) . "\n";
    exit(1);
}
echo "✓ 数据文件可写\n";
echo "文件大小: " . filesize($dataFile) . " bytes\n\n";

// 2. 测试读取数据
echo "2. 测试读取数据\n";
$content = file_get_contents($dataFile);
if ($content === false) {
    echo "✗ 无法读取文件\n";
    exit(1);
}
echo "✓ 文件读取成功\n";

$nodes = json_decode($content, true);
if ($nodes === null) {
    echo "✗ JSON解析失败: " . json_last_error_msg() . "\n";
    exit(1);
}
echo "✓ JSON解析成功\n";
echo "节点总数: " . count($nodes) . "\n\n";

// 3. 找一个节点进行测试
echo "3. 选择测试节点\n";
if (empty($nodes)) {
    echo "✗ 没有节点可测试\n";
    exit(1);
}

$testNode = $nodes[0];
$nodeHash = $testNode['node_hash'];
echo "测试节点: {$testNode['name']}\n";
echo "节点哈希: $nodeHash\n\n";

// 4. 模拟保存操作
echo "4. 模拟保存操作\n";

// 准备测试数据
$testResult = [
    'available' => true,
    'latency' => '999ms',
    'real_ip' => '8.8.8.8',
    'purity' => [
        'score' => 88,
        'level' => '良好',
        'type' => '测试'
    ]
];

echo "测试数据:\n";
echo json_encode($testResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 更新节点数据
$found = false;
foreach ($nodes as &$node) {
    if ($node['node_hash'] === $nodeHash) {
        echo "✓ 找到目标节点\n";
        
        $node['available'] = $testResult['available'] ? 1 : 0;
        $node['latency'] = $testResult['latency'];
        $node['real_ip'] = $testResult['real_ip'];
        $node['purity'] = $testResult['purity'];
        $node['ip_purity_score'] = $testResult['purity']['score'] ?? null;
        $node['last_check_time'] = date('Y-m-d H:i:s');
        $node['check_count'] = ($node['check_count'] ?? 0) + 1;
        $node['success_count'] = ($node['success_count'] ?? 0) + 1;
        $node['updated_at'] = date('Y-m-d H:i:s');
        
        echo "更新后的节点数据:\n";
        echo json_encode([
            'name' => $node['name'],
            'available' => $node['available'],
            'latency' => $node['latency'],
            'real_ip' => $node['real_ip'],
            'ip_purity_score' => $node['ip_purity_score'],
            'last_check_time' => $node['last_check_time']
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
        
        $found = true;
        break;
    }
}

if (!$found) {
    echo "✗ 未找到目标节点\n";
    exit(1);
}

// 5. 测试写入
echo "5. 测试写入文件\n";

// 备份原文件
$backupFile = $dataFile . '.backup.' . date('YmdHis');
if (!copy($dataFile, $backupFile)) {
    echo "✗ 无法创建备份\n";
    exit(1);
}
echo "✓ 已创建备份: $backupFile\n";

// 写入测试
$jsonData = json_encode($nodes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($jsonData === false) {
    echo "✗ JSON编码失败: " . json_last_error_msg() . "\n";
    exit(1);
}
echo "✓ JSON编码成功\n";
echo "JSON大小: " . strlen($jsonData) . " bytes\n";

$result = file_put_contents($dataFile, $jsonData);
if ($result === false) {
    echo "✗ 写入失败\n";
    // 恢复备份
    copy($backupFile, $dataFile);
    echo "已恢复备份\n";
    exit(1);
}

echo "✓ 写入成功: $result bytes\n\n";

// 6. 验证写入
echo "6. 验证写入结果\n";
$verifyContent = file_get_contents($dataFile);
$verifyNodes = json_decode($verifyContent, true);

if ($verifyNodes === null) {
    echo "✗ 验证失败: JSON解析错误\n";
    // 恢复备份
    copy($backupFile, $dataFile);
    echo "已恢复备份\n";
    exit(1);
}

$verifyNode = null;
foreach ($verifyNodes as $node) {
    if ($node['node_hash'] === $nodeHash) {
        $verifyNode = $node;
        break;
    }
}

if (!$verifyNode) {
    echo "✗ 验证失败: 找不到节点\n";
    exit(1);
}

echo "✓ 验证成功\n";
echo "验证数据:\n";
echo json_encode([
    'name' => $verifyNode['name'],
    'available' => $verifyNode['available'],
    'latency' => $verifyNode['latency'],
    'real_ip' => $verifyNode['real_ip'],
    'ip_purity_score' => $verifyNode['ip_purity_score'],
    'last_check_time' => $verifyNode['last_check_time']
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 7. 恢复原数据
echo "7. 恢复原数据\n";
if (!copy($backupFile, $dataFile)) {
    echo "✗ 恢复失败\n";
    exit(1);
}
echo "✓ 已恢复原数据\n";

// 删除备份
unlink($backupFile);
echo "✓ 已删除备份\n\n";

echo "========================================\n";
echo "✓✓✓ 所有测试通过！\n";
echo "========================================\n";
