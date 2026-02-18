<?php
/**
 * 解析 Clash YAML 配置文件
 */

// 禁用错误输出,避免破坏JSON格式
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

try {
    // 获取内容
    $content = '';
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $content = file_get_contents($_FILES['file']['tmp_name']);
        $method = "FILE Upload";
    } else {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $content = $raw;
            $method = "RAW Body";
        }
    }
    
    if (empty($content)) {
        throw new Exception('未接收到文件内容');
    }

    // Debug log
    $logFile = __DIR__ . '/../data/debug_parse.log';
    $logData = "Time: " . date('Y-m-d H:i:s') . "\n";
    $logData .= "Method: " . ($method ?? 'Unknown') . "\n";
    $logData .= "File Size: " . strlen($content) . "\n";
    $lastChars = substr($content, -20);
    $logData .= "Last 20 chars: [" . addcslashes($lastChars, "\r\n\t") . "]\n";
    
    // 解析 YAML
    try {
        $config = Yaml::parse($content);
    } catch (Exception $e) {
        $logData .= "YAML Parse Error: " . $e->getMessage() . "\n";
        file_put_contents($logFile, $logData, FILE_APPEND);
        throw new Exception('YAML解析失败: ' . $e->getMessage());
    }
    
    if (!isset($config['proxies']) || !is_array($config['proxies'])) {
        file_put_contents($logFile, $logData . "Error: No proxies found\n", FILE_APPEND);
        throw new Exception('配置文件中未找到 proxies 节点');
    }

    $proxiesCount = count($config['proxies']);
    $logData .= "Proxies found in YAML: " . $proxiesCount . "\n";
    
    $nodes = [];
    $validCount = 0;
    
    foreach ($config['proxies'] as $index => $proxy) {
        if (!isset($proxy['name']) || !isset($proxy['type']) || !isset($proxy['server']) || !isset($proxy['port'])) {
            $logData .= "Skipped proxy at index $index: Missing required fields. Data: " . json_encode($proxy) . "\n";
            continue;
        }

        $nodes[] = [
            'name' => $proxy['name'],
            'type' => $proxy['type'],
            'server' => $proxy['server'],
            'port' => $proxy['port'],
            'raw' => $proxy,
            'available' => null,
            'latency' => null,
            'purity' => null
        ];
        $validCount++;
    }
    
    $logData .= "Valid nodes extracted: " . $validCount . "\n";
    file_put_contents($logFile, $logData . "--------------------------------\n", FILE_APPEND);

    echo json_encode([
        'success' => true,
        'nodes' => $nodes,
        'total' => count($nodes),
        'debug_total_found' => $proxiesCount
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
