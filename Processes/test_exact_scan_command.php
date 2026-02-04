#!/usr/bin/env php
<?php
echo "=== 测试 scan.php 中的实际命令 ===\n\n";

// 模拟 scan.php 的环境
define('AGGREGATOR_DIR', '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator');
define('DATA_DIR', '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data');

// 切换到 aggregator 目录
chdir(AGGREGATOR_DIR);
putenv('PYTHONPATH=' . AGGREGATOR_DIR);

echo "当前目录: " . getcwd() . "\n";
echo "PYTHONPATH: " . getenv('PYTHONPATH') . "\n\n";

// 读取代理配置
$proxyFile = DATA_DIR . '/proxy_config.json';
$proxyConfig = json_decode(file_get_contents($proxyFile), true);

echo "代理配置:\n";
print_r($proxyConfig);
echo "\n";

// 构建命令（与 scan.php 完全一致）
$mysourcesFile = '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/my_sources.txt';

if ($proxyConfig && $proxyConfig['enable']) {
    $cmd = "python3 proxy_wrapper.py --yourself " . escapeshellarg($mysourcesFile) . " --skip --num 200 --targets clash 2>&1";
} else {
    $cmd = "python3 subscribe/collect.py --yourself " . escapeshellarg($mysourcesFile) . " --skip --num 200 --targets clash 2>&1";
}

echo "执行命令:\n$cmd\n\n";

echo "=== 开始执行 ===\n";
$output = [];
$returnCode = 0;
exec($cmd, $output, $returnCode);

echo "返回码: $returnCode\n";
echo "输出前20行:\n";
echo implode("\n", array_slice($output, 0, 20));
echo "\n";
?>
