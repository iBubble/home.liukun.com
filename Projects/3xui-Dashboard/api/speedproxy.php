<?php
/**
 * OpenSpeedTest 反向代理
 * 中继所有请求（下载/上传/Ping）到目标测速服务器
 * 解决跨域 CORS 限制
 */
$server = $_GET['server'] ?? '';
$path = $_GET['path'] ?? '';

set_time_limit(120);
ini_set('max_execution_time', 120);

$hosts = [
    'hk'  => 'hk.liukun.com',
    'hk1' => 'hk1.liukun.com',
    'sg'  => 'sg.liukun.com',
    'us'  => 'us.liukun.com',
];
if (!isset($hosts[$server])) { http_response_code(400); die('Invalid'); }

$host = $hosts[$server];
$port = 8989;
$targetUrl = "https://{$host}:{$port}/" . ltrim($path, '/');

$params = $_GET;
unset($params['server'], $params['path']);
if ($params) $targetUrl .= '?' . http_build_query($params);

$method = $_SERVER['REQUEST_METHOD'];

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store');

if ($method === 'OPTIONS') { http_response_code(204); exit; }

$ch = curl_init($targetUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HEADERFUNCTION => function($ch, $header) {
        $len = strlen($header);
        $h = trim($header);
        if (!$h || stripos($h, 'HTTP/') === 0) return $len;
        $lower = strtolower($h);
        if (strpos($lower, 'transfer-encoding') === false &&
            strpos($lower, 'content-encoding') === false &&
            strpos($lower, 'access-control') === false) {
            header($h);
        }
        return $len;
    },
    CURLOPT_WRITEFUNCTION => function($ch, $data) {
        echo $data;
        flush();
        return strlen($data);
    },
]);

if ($method === 'POST') {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    if (isset($_SERVER['CONTENT_TYPE'])) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: ' . $_SERVER['CONTENT_TYPE']]);
    }
}
if ($method === 'HEAD') {
    curl_setopt($ch, CURLOPT_NOBODY, true);
}

while (ob_get_level()) ob_end_flush();
curl_exec($ch);
if (curl_errno($ch)) { http_response_code(502); }
curl_close($ch);
