<?php
/**
 * 测试导出去重功能
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "========== 测试导出节点名称去重 ==========\n\n";

// 模拟有重复名称的节点
$testNodes = [
    ['name' => '美国节点', 'raw' => ['name' => '美国节点', 'type' => 'ss', 'server' => '1.1.1.1', 'port' => 443]],
    ['name' => '美国节点', 'raw' => ['name' => '美国节点', 'type' => 'ss', 'server' => '2.2.2.2', 'port' => 443]],
    ['name' => '美国节点', 'raw' => ['name' => '美国节点', 'type' => 'ss', 'server' => '3.3.3.3', 'port' => 443]],
    ['name' => '香港节点', 'raw' => ['name' => '香港节点', 'type' => 'ss', 'server' => '4.4.4.4', 'port' => 443]],
    ['name' => '香港节点', 'raw' => ['name' => '香港节点', 'type' => 'ss', 'server' => '5.5.5.5', 'port' => 443]],
];

echo "原始节点名称:\n";
foreach ($testNodes as $node) {
    echo "  - " . $node['name'] . "\n";
}
echo "\n";

// 应用去重逻辑
$usedNames = [];
$proxies = [];

foreach ($testNodes as $node) {
    if (isset($node['raw'])) {
        $rawNode = $node['raw'];
        $originalName = $rawNode['name'];
        
        // 确保节点名称唯一
        $uniqueName = $originalName;
        $counter = 1;
        while (in_array($uniqueName, $usedNames)) {
            $uniqueName = $originalName . '_' . $counter;
            $counter++;
        }
        
        $rawNode['name'] = $uniqueName;
        $usedNames[] = $uniqueName;
        
        $proxies[] = $rawNode;
    }
}

echo "去重后的节点名称:\n";
foreach ($proxies as $proxy) {
    echo "  - " . $proxy['name'] . " (server: " . $proxy['server'] . ")\n";
}
echo "\n";

// 验证唯一性
$uniqueCheck = array_unique($usedNames);
if (count($usedNames) === count($uniqueCheck)) {
    echo "✅ 所有节点名称唯一\n";
} else {
    echo "❌ 仍有重复的节点名称\n";
}

echo "\n========== 测试完成 ==========\n";
