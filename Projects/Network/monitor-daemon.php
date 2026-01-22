#!/usr/bin/env php
<?php
/**
 * 网络监测后台守护进程
 * 持续监测网络状态，直到被停止
 */

// 设置为CLI模式
if (php_sapi_name() !== 'cli') {
    die('此脚本只能在命令行模式下运行');
}

// 设置时区
date_default_timezone_set('Asia/Shanghai');

// 设置无限执行时间
set_time_limit(0);
ini_set('memory_limit', '256M');

// 文件路径
$stateFile = __DIR__ . '/logs/monitor_state.json';
$logsDir = __DIR__ . '/logs/';

// 监测目标配置
$targets = [
    'lan' => ['host' => '192.168.1.1', 'port' => 80, 'timeout' => 3],
    'wan' => ['host' => '114.114.114.114', 'port' => 53, 'timeout' => 5],
    'intl' => ['host' => '8.8.8.8', 'port' => 53, 'timeout' => 5]
];

// 统计数据
$stats = [
    'lan' => ['total' => 0, 'success' => 0, 'failures' => 0, 'latencies' => [], 'failureCount' => 0, 'totalFailureDuration' => 0],
    'wan' => ['total' => 0, 'success' => 0, 'failures' => 0, 'latencies' => [], 'failureCount' => 0, 'totalFailureDuration' => 0],
    'intl' => ['total' => 0, 'success' => 0, 'failures' => 0, 'latencies' => [], 'failureCount' => 0, 'totalFailureDuration' => 0]
];

// 如果状态文件存在且正在运行，恢复统计数据
if (file_exists($stateFile)) {
    $existingState = json_decode(file_get_contents($stateFile), true);
    if ($existingState['isRunning'] && isset($existingState['stats'])) {
        $stats = $existingState['stats'];
        echo "[" . date('Y-m-d H:i:s') . "] 已恢复现有会话的统计数据\n";
    }
}

// 日志
$logs = [];

// 故障状态
$failureStates = [
    'lan' => ['isFailing' => false, 'startTime' => null],
    'wan' => ['isFailing' => false, 'startTime' => null],
    'intl' => ['isFailing' => false, 'startTime' => null]
];

echo "[" . date('Y-m-d H:i:s') . "] 网络监测守护进程启动\n";

// 主循环
while (true) {
    // 读取状态文件
    if (!file_exists($stateFile)) {
        echo "[" . date('Y-m-d H:i:s') . "] 状态文件不存在，等待启动...\n";
        sleep(5);
        continue;
    }
    
    $state = json_decode(file_get_contents($stateFile), true);
    
    // 检查是否应该运行
    if (!$state['isRunning']) {
        echo "[" . date('Y-m-d H:i:s') . "] 监测已停止\n";
        
        // 如果有数据，保存会话
        if (!empty($logs)) {
            saveSession($state['sessionId'], $state['startTime'], $logs, $stats, $logsDir);
            $logs = [];
            $stats = [
                'lan' => ['total' => 0, 'success' => 0, 'failures' => 0, 'latencies' => [], 'failureCount' => 0, 'totalFailureDuration' => 0],
                'wan' => ['total' => 0, 'success' => 0, 'failures' => 0, 'latencies' => [], 'failureCount' => 0, 'totalFailureDuration' => 0],
                'intl' => ['total' => 0, 'success' => 0, 'failures' => 0, 'latencies' => [], 'failureCount' => 0, 'totalFailureDuration' => 0]
            ];
            
            // 清空状态文件中的统计数据
            $state['stats'] = $stats;
            file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT));
            @chmod($stateFile, 0666);
        }
        
        sleep(5);
        continue;
    }
    
    $interval = $state['interval'] / 1000; // 转换为秒
    
    echo "[" . date('Y-m-d H:i:s') . "] 执行监测检查...\n";
    
    // 执行监测
    foreach ($targets as $type => $config) {
        $result = checkNetwork($config['host'], $config['port'], $config['timeout']);
        
        $stats[$type]['total']++;
        
        if ($result['success']) {
            $stats[$type]['success']++;
            $stats[$type]['latencies'][] = $result['latency'];
            
            // 如果之前是故障状态，记录恢复
            if ($failureStates[$type]['isFailing']) {
                $duration = time() - $failureStates[$type]['startTime'];
                $stats[$type]['failureCount']++;
                $stats[$type]['totalFailureDuration'] += $duration * 1000; // 转换为毫秒
                addLog($logs, 'info', $type, "网络已恢复 (故障持续: " . formatDuration($duration * 1000) . ")");
                $failureStates[$type]['isFailing'] = false;
                $failureStates[$type]['startTime'] = null;
            }
            
            echo "  [$type] 在线 - 延迟: {$result['latency']}ms\n";
        } else {
            $stats[$type]['failures']++;
            
            // 如果是新故障，记录开始时间
            if (!$failureStates[$type]['isFailing']) {
                $failureStates[$type]['isFailing'] = true;
                $failureStates[$type]['startTime'] = time();
                addLog($logs, 'error', $type, "网络故障: {$result['error']}");
            }
            
            echo "  [$type] 离线 - {$result['error']}\n";
        }
    }
    
    // 更新状态文件中的统计数据
    $state['stats'] = $stats;
    file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT));
    @chmod($stateFile, 0666);
    
    // 定期保存日志（每100条或每5分钟）
    if (count($logs) >= 100 || (count($logs) > 0 && time() % 300 == 0)) {
        saveSession($state['sessionId'], $state['startTime'], $logs, $stats, $logsDir);
    }
    
    // 等待下一次检测
    sleep($interval);
}

/**
 * 检测网络连接
 */
function checkNetwork($host, $port, $timeout) {
    $startTime = microtime(true);
    $errno = 0;
    $errstr = '';
    
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
    
    $endTime = microtime(true);
    $latency = round(($endTime - $startTime) * 1000, 2);
    
    if ($socket) {
        fclose($socket);
        return [
            'success' => true,
            'latency' => $latency
        ];
    } else {
        return [
            'success' => false,
            'latency' => $latency,
            'error' => $errstr ?: '连接超时'
        ];
    }
}

/**
 * 添加日志
 */
function addLog(&$logs, $type, $network, $message) {
    $logs[] = [
        'time' => date('c'),
        'type' => $type,
        'network' => $network,
        'message' => $message
    ];
    
    // 限制日志数量
    if (count($logs) > 1000) {
        $logs = array_slice($logs, -1000);
    }
}

/**
 * 格式化持续时间
 */
function formatDuration($ms) {
    $seconds = floor($ms / 1000);
    $minutes = floor($seconds / 60);
    $hours = floor($minutes / 60);
    
    $h = str_pad($hours, 2, '0', STR_PAD_LEFT);
    $m = str_pad($minutes % 60, 2, '0', STR_PAD_LEFT);
    $s = str_pad($seconds % 60, 2, '0', STR_PAD_LEFT);
    
    return "$h:$m:$s";
}

/**
 * 保存会话
 */
function saveSession($sessionId, $startTime, $logs, $stats, $logsDir) {
    if (empty($logs)) return;
    
    $sessionData = [
        'sessionId' => $sessionId,
        'startTime' => $startTime,
        'endTime' => date('c'),
        'logs' => $logs,
        'stats' => $stats
    ];
    
    $filename = $logsDir . $sessionId . '.json';
    file_put_contents($filename, json_encode($sessionData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    chmod($filename, 0666);
    
    echo "[" . date('Y-m-d H:i:s') . "] 会话已保存: $sessionId\n";
}
?>
