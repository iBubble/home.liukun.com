<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$logsDir = __DIR__ . '/../Projects/Network/logs/';

// 确保日志目录存在
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0775, true);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'save':
        // 保存日志会话
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data || !isset($data['sessionId'])) {
            echo json_encode(['success' => false, 'error' => '无效的数据']);
            exit;
        }
        
        $sessionId = preg_replace('/[^a-zA-Z0-9_-]/', '', $data['sessionId']);
        $filename = $logsDir . $sessionId . '.json';
        
        if (file_put_contents($filename, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
            chmod($filename, 0664);
            echo json_encode(['success' => true, 'sessionId' => $sessionId]);
        } else {
            echo json_encode(['success' => false, 'error' => '保存失败']);
        }
        break;
        
    case 'list':
        // 列出所有会话
        $sessions = [];
        $files = glob($logsDir . 'session_*.json');
        
        foreach ($files as $file) {
            $content = file_get_contents($file);
            $data = json_decode($content, true);
            
            if ($data) {
                $sessions[] = [
                    'sessionId' => $data['sessionId'],
                    'startTime' => $data['startTime'],
                    'endTime' => $data['endTime'],
                    'logCount' => count($data['logs'] ?? [])
                ];
            }
        }
        
        // 按开始时间倒序排序
        usort($sessions, function($a, $b) {
            return strtotime($b['startTime']) - strtotime($a['startTime']);
        });
        
        echo json_encode(['success' => true, 'sessions' => $sessions]);
        break;
        
    case 'load':
        // 加载指定会话
        $sessionId = $_GET['sessionId'] ?? '';
        $sessionId = preg_replace('/[^a-zA-Z0-9_-]/', '', $sessionId);
        $filename = $logsDir . $sessionId . '.json';
        
        if (file_exists($filename)) {
            $content = file_get_contents($filename);
            $data = json_decode($content, true);
            echo json_encode(['success' => true, 'session' => $data]);
        } else {
            echo json_encode(['success' => false, 'error' => '会话不存在']);
        }
        break;
        
    case 'delete':
        // 删除指定会话
        $sessionId = $_GET['sessionId'] ?? $_POST['sessionId'] ?? '';
        $sessionId = preg_replace('/[^a-zA-Z0-9_-]/', '', $sessionId);
        $filename = $logsDir . $sessionId . '.json';
        
        if (file_exists($filename)) {
            if (unlink($filename)) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => '删除失败']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => '会话不存在']);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => '无效的操作']);
        break;
}
?>
