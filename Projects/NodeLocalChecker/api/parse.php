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
    if (!isset($_FILES['file'])) {
        throw new Exception('未接收到文件');
    }

    $file = $_FILES['file'];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('文件上传失败');
    }

    // 读取文件内容
    $content = file_get_contents($file['tmp_name']);
    
    if ($content === false) {
        throw new Exception('无法读取文件内容');
    }

    // 解析 YAML
    $config = Yaml::parse($content);
    
    if (!isset($config['proxies']) || !is_array($config['proxies'])) {
        throw new Exception('配置文件中未找到 proxies 节点');
    }

    $nodes = [];
    foreach ($config['proxies'] as $proxy) {
        if (!isset($proxy['name']) || !isset($proxy['type']) || !isset($proxy['server']) || !isset($proxy['port'])) {
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
    }

    echo json_encode([
        'success' => true,
        'nodes' => $nodes,
        'total' => count($nodes)
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
