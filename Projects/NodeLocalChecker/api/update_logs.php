<?php
/**
 * 获取更新日志
 */

// 禁用错误输出,避免破坏JSON格式
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $dataDir = __DIR__ . '/../data';
    $logFile = $dataDir . '/update_logs.json';
    
    // 读取更新日志
    $logs = [];
    if (file_exists($logFile)) {
        $logs = json_decode(file_get_contents($logFile), true) ?: [];
    }
    
    // 按时间倒序排列
    usort($logs, function($a, $b) {
        return $b['created_at'] - $a['created_at'];
    });
    
    // 格式化时间
    foreach ($logs as &$log) {
        $log['created_at_formatted'] = date('Y-m-d H:i:s', $log['created_at']);
    }
    
    echo json_encode([
        'success' => true,
        'logs' => $logs,
        'total' => count($logs)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
