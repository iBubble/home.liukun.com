<?php
/**
 * 节点管理API
 * 支持: 获取节点列表、保存节点、更新节点、合并节点
 */

// 禁用错误输出,避免破坏JSON格式
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/storage.php';

try {
    $storage = new NodeStorage();
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $action = $_GET['action'] ?? $data['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            // 获取所有节点
            $nodes = $storage->getAllNodes();
            
            echo json_encode([
                'success' => true,
                'nodes' => $nodes,
                'total' => count($nodes)
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'merge':
            // 合并新节点
            if (!isset($data['nodes']) || !is_array($data['nodes'])) {
                throw new Exception('缺少节点数据');
            }
            
            $source = $data['source'] ?? 'manual';
            $newNodes = $data['nodes'];
            
            $stats = $storage->mergeNodes($newNodes, $source);
            
            echo json_encode([
                'success' => true,
                'stats' => $stats
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_check':
            // 更新检测结果
            if (!isset($data['node_hash']) || !isset($data['result'])) {
                throw new Exception('缺少必要参数');
            }
            
            $nodeHash = $data['node_hash'];
            $result = $data['result'];
            
            $success = $storage->updateCheckResult($nodeHash, $result);
            
            echo json_encode([
                'success' => $success,
                'message' => $success ? '检测结果已更新' : '节点不存在'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'delete':
            // 删除节点
            if (!isset($data['node_hashes']) || !is_array($data['node_hashes'])) {
                throw new Exception('缺少节点标识');
            }
            
            $deleted = $storage->deleteNodes($data['node_hashes']);
            
            echo json_encode([
                'success' => true,
                'deleted' => $deleted
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'clear_all':
            // 清除所有节点
            $deleted = $storage->clearAllNodes();
            
            echo json_encode([
                'success' => true,
                'deleted' => $deleted,
                'message' => '所有节点已清除'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'stats':
            // 获取统计信息
            $stats = $storage->getStats();
            
            echo json_encode([
                'success' => true,
                'stats' => $stats
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            throw new Exception('未知操作: ' . $action);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
