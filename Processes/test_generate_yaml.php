<?php
// 测试生成YAML功能

define('DATA_DIR', dirname(__DIR__) . '/Projects/Aggregator/data');
define('AGGREGATOR_DIR', dirname(__DIR__) . '/Projects/Aggregator/external/aggregator');

// 包含必要的函数
require_once dirname(__DIR__) . '/Projects/Aggregator/api/index.php';

// 读取nodes.json
$nodesFile = DATA_DIR . '/nodes.json';
if (!file_exists($nodesFile)) {
    die("节点文件不存在\n");
}

$nodes = json_decode(file_get_contents($nodesFile), true);
echo "读取到 " . count($nodes) . " 个节点\n";

// 生成YAML
try {
    $yaml = generateClashYaml($nodes);
    
    // 保存到文件
    $outputFile = DATA_DIR . '/test_custom.yaml';
    file_put_contents($outputFile, $yaml);
    
    echo "YAML文件已生成: $outputFile\n";
    echo "文件大小: " . filesize($outputFile) . " 字节\n";
    
    // 显示前50行
    $lines = explode("\n", $yaml);
    echo "\n前50行内容:\n";
    echo "================\n";
    foreach (array_slice($lines, 0, 50) as $line) {
        echo $line . "\n";
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
}
