<?php
/**
 * 检查 Clash 核心是否可用
 */

// 禁用错误输出,避免破坏JSON格式
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$clashAvailable = false;
$clashPath = null;

// 检查常见的 Clash 二进制文件位置
$possiblePaths = [
    __DIR__ . '/../bin/clash',
    '/usr/local/bin/clash',
    '/usr/bin/clash',
    '/opt/clash/clash'
];

foreach ($possiblePaths as $path) {
    if (file_exists($path) && is_executable($path)) {
        $clashPath = $path;
        $clashAvailable = true;
        break;
    }
}

echo json_encode([
    'available' => $clashAvailable,
    'path' => $clashPath,
    'message' => $clashAvailable 
        ? 'Clash 核心已安装，将使用真实代理测试' 
        : 'Clash 未安装，将使用简单TCP测试（准确度较低）'
], JSON_UNESCAPED_UNICODE);
