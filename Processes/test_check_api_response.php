<?php
/**
 * 测试 check.php API 返回的数据格式
 */

echo "=== 测试节点检测API返回格式 ===\n\n";

// 模拟一个简单的节点数据
$testNode = [
    'name' => '测试节点',
    'type' => 'ss',
    'server' => '8.8.8.8',
    'port' => 443,
    'password' => 'test',
    'cipher' => 'aes-256-gcm'
];

// 直接包含并测试 check.php 中的函数
require_once __DIR__ . '/../Projects/NodeLocalChecker/api/check.php';

// 测试IP纯净度检测函数
$testIP = '8.8.8.8';
echo "测试IP: $testIP\n\n";

if (function_exists('checkIPPurityInternal')) {
    $purityResult = checkIPPurityInternal($testIP);
    
    echo "IP纯净度检测结果:\n";
    echo "原始数据:\n";
    print_r($purityResult);
    
    echo "\nJSON格式:\n";
    echo json_encode($purityResult, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    echo "\n";
} else {
    echo "错误: checkIPPurityInternal 函数不存在\n";
}
