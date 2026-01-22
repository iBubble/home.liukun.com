<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$stateFile = __DIR__ . '/../Projects/Network/logs/monitor_state.json';

// 确保目录存在
$logsDir = dirname($stateFile);
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0777, true);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'get':
        // 获取当前监测状态
        if (file_exists($stateFile)) {
            $state = json_decode(file_get_contents($stateFile), true);
            
            // 检查状态是否过期（超过30秒没有更新视为已停止）
            if (isset($state['lastUpdate'])) {
                $lastUpdate = strtotime($state['lastUpdate']);
                if (time() - $lastUpdate > 30) {
                    $state['isRunning'] = false;
                }
            }
            
            echo json_encode(['success' => true, 'state' => $state]);
        } else {
            // 默认状态
            $defaultState = [
                'isRunning' => false,
                'sessionId' => null,
                'startTime' => null,
                'interval' => 5000,
                'lastUpdate' => date('c')
            ];
            echo json_encode(['success' => true, 'state' => $defaultState]);
        }
        break;
        
    case 'start':
        // 开始监测
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        $state = [
            'isRunning' => true,
            'sessionId' => $data['sessionId'] ?? 'session_' . time(),
            'startTime' => $data['startTime'] ?? date('c'),
            'interval' => $data['interval'] ?? 5000,
            'lastUpdate' => date('c')
        ];
        
        if (file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT))) {
            @chmod($stateFile, 0666);
            
            // 提示用户手动启动守护进程
            echo json_encode([
                'success' => true, 
                'state' => $state,
                'message' => '状态已更新，请确保守护进程正在运行'
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => '保存状态失败']);
        }
        break;
        
    case 'stop':
        // 停止监测
        $state = [
            'isRunning' => false,
            'sessionId' => null,
            'startTime' => null,
            'interval' => 5000,
            'lastUpdate' => date('c')
        ];
        
        if (file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT))) {
            @chmod($stateFile, 0666);
            echo json_encode(['success' => true, 'state' => $state]);
        } else {
            echo json_encode(['success' => false, 'error' => '保存状态失败']);
        }
        break;
        
    case 'heartbeat':
        // 心跳更新
        if (file_exists($stateFile)) {
            $state = json_decode(file_get_contents($stateFile), true);
            if ($state['isRunning']) {
                $state['lastUpdate'] = date('c');
                file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT));
                echo json_encode(['success' => true, 'state' => $state]);
            } else {
                echo json_encode(['success' => true, 'state' => $state]);
            }
        } else {
            echo json_encode(['success' => false, 'error' => '状态文件不存在']);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => '无效的操作']);
        break;
}
?>
