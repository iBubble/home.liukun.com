<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// 获取目标地址
$target = $_GET['target'] ?? '';

if (empty($target)) {
    echo json_encode([
        'success' => false,
        'error' => '未指定目标地址'
    ]);
    exit;
}

// 目标配置
$targets = [
    '192.168.1.1' => ['host' => '192.168.1.1', 'port' => 80, 'timeout' => 3],
    '114.114.114.114' => ['host' => '114.114.114.114', 'port' => 53, 'timeout' => 5],
    '8.8.8.8' => ['host' => '8.8.8.8', 'port' => 53, 'timeout' => 5],
    'dns.google' => ['host' => 'dns.google', 'port' => 53, 'timeout' => 5]
];

if (!isset($targets[$target])) {
    echo json_encode([
        'success' => false,
        'error' => '不允许的目标地址'
    ]);
    exit;
}

$config = $targets[$target];
$host = $config['host'];
$port = $config['port'];
$timeout = $config['timeout'];

// 使用fsockopen测试连接
$startTime = microtime(true);
$errno = 0;
$errstr = '';

// 尝试建立连接
$socket = @fsockopen($host, $port, $errno, $errstr, $timeout);

$endTime = microtime(true);
$latency = round(($endTime - $startTime) * 1000, 2);

if ($socket) {
    fclose($socket);
    
    echo json_encode([
        'success' => true,
        'target' => $target,
        'latency' => $latency,
        'timestamp' => time(),
        'method' => 'tcp',
        'port' => $port
    ]);
} else {
    echo json_encode([
        'success' => false,
        'target' => $target,
        'latency' => $latency,
        'timestamp' => time(),
        'error' => $errstr ?: '连接超时',
        'errno' => $errno
    ]);
}
?>
