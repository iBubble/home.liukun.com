<?php
/**
 * 测试IP纯净度API返回格式
 */

// 测试IP
$testIP = '8.8.8.8';

echo "=== 测试IP纯净度检测API ===\n";
echo "测试IP: $testIP\n\n";

// 调用API
$url = 'http://localhost/Projects/NodeLocalChecker/api/check_ip_purity.php';
$data = json_encode(['ip' => $testIP]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP状态码: $httpCode\n";
echo "API响应:\n";
echo $response . "\n\n";

// 解析JSON
$result = json_decode($response, true);
if ($result) {
    echo "解析后的数据:\n";
    print_r($result);
    
    if (isset($result['purity'])) {
        echo "\n纯净度数据:\n";
        print_r($result['purity']);
    }
} else {
    echo "JSON解析失败\n";
}
