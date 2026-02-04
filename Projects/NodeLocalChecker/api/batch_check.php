<?php
/**
 * 批量检测节点 - 后端并发
 */

// 禁用错误输出,避免破坏JSON格式
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['nodes']) || !is_array($data['nodes'])) {
        throw new Exception('缺少节点信息');
    }

    $nodes = $data['nodes'];
    $results = [];

    // 使用 Python 脚本批量检测
    $pythonScript = __DIR__ . '/../scripts/batch_check.py';
    
    // 将节点数据写入临时文件
    $tempFile = tempnam(sys_get_temp_dir(), 'nodes_');
    file_put_contents($tempFile, json_encode($nodes));

    $command = sprintf(
        'python3 %s %s 2>&1',
        escapeshellarg($pythonScript),
        escapeshellarg($tempFile)
    );

    exec($command, $output, $returnCode);
    $result = implode("\n", $output);

    // 删除临时文件
    unlink($tempFile);

    // 解析检测结果
    $checkResults = json_decode($result, true);

    if ($checkResults && isset($checkResults['results'])) {
        echo json_encode([
            'success' => true,
            'results' => $checkResults['results'],
            'total' => count($checkResults['results']),
            'available' => $checkResults['available'] ?? 0
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('批量检测失败: ' . $result);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
