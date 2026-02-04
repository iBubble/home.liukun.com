<?php
/**
 * 节点存储管理 - 使用JSON文件
 */

class NodeStorage {
    private $dataFile;
    private $logFile;
    
    public function __construct() {
        $dataDir = __DIR__ . '/../data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0775, true);
        }
        
        $this->dataFile = $dataDir . '/nodes.json';
        $this->logFile = $dataDir . '/update_logs.json';
        
        // 初始化文件
        if (!file_exists($this->dataFile)) {
            file_put_contents($this->dataFile, json_encode([], JSON_PRETTY_PRINT));
        }
        if (!file_exists($this->logFile)) {
            file_put_contents($this->logFile, json_encode([], JSON_PRETTY_PRINT));
        }
    }
    
    /**
     * 获取所有节点
     */
    public function getAllNodes() {
        $data = json_decode(file_get_contents($this->dataFile), true);
        if (!$data) return [];
        
        // 排序: 可用节点优先,然后按最后检测时间
        usort($data, function($a, $b) {
            if ($a['available'] !== $b['available']) {
                return $b['available'] <=> $a['available'];
            }
            return ($b['last_check_time'] ?? 0) <=> ($a['last_check_time'] ?? 0);
        });
        
        return $data;
    }
    
    /**
     * 合并节点
     */
    public function mergeNodes($newNodes, $source = 'manual') {
        $existing = $this->getAllNodes();
        $existingMap = [];
        
        // 建立现有节点的映射
        foreach ($existing as $node) {
            $existingMap[$node['node_hash']] = $node;
        }
        
        $stats = [
            'added' => 0,
            'updated' => 0,
            'unchanged' => 0,
            'total' => count($newNodes)
        ];
        
        $now = time();
        
        foreach ($newNodes as $node) {
            $nodeHash = $this->generateNodeHash($node);
            
            if (isset($existingMap[$nodeHash])) {
                // 节点已存在,只更新基本信息,保留检测历史
                $existingNode = $existingMap[$nodeHash];
                
                if ($existingNode['name'] !== $node['name'] || 
                    json_encode($existingNode['raw']) !== json_encode($node['raw'] ?? $node)) {
                    $existingMap[$nodeHash]['name'] = $node['name'];
                    $existingMap[$nodeHash]['raw'] = $node['raw'] ?? $node;
                    $existingMap[$nodeHash]['updated_at'] = $now;
                    $stats['updated']++;
                } else {
                    $stats['unchanged']++;
                }
            } else {
                // 新节点
                $existingMap[$nodeHash] = [
                    'node_hash' => $nodeHash,
                    'name' => $node['name'],
                    'type' => $node['type'],
                    'server' => $node['server'],
                    'port' => $node['port'],
                    'raw' => $node['raw'] ?? $node,
                    'available' => null,
                    'latency' => null,
                    'real_ip' => null,
                    'purity' => null,
                    'last_check_time' => null,
                    'check_count' => 0,
                    'success_count' => 0,
                    'created_at' => $now,
                    'updated_at' => $now
                ];
                $stats['added']++;
            }
        }
        
        // 保存
        $allNodes = array_values($existingMap);
        file_put_contents($this->dataFile, json_encode($allNodes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        // 记录日志
        $this->logUpdate($source, $stats);
        
        return $stats;
    }
    
    /**
     * 更新检测结果
     */
    public function updateCheckResult($nodeHash, $result) {
        $nodes = $this->getAllNodes();
        $found = false;
        
        foreach ($nodes as &$node) {
            if ($node['node_hash'] === $nodeHash) {
                $node['available'] = $result['available'] ? 1 : 0;
                $node['latency'] = $result['latency'] ?? null;
                $node['real_ip'] = $result['real_ip'] ?? null;
                $node['purity'] = $result['purity'] ?? null;
                $node['last_check_time'] = time();
                $node['check_count'] = ($node['check_count'] ?? 0) + 1;
                if ($result['available']) {
                    $node['success_count'] = ($node['success_count'] ?? 0) + 1;
                }
                $node['updated_at'] = time();
                $found = true;
                break;
            }
        }
        
        if ($found) {
            file_put_contents($this->dataFile, json_encode($nodes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        
        return $found;
    }
    
    /**
     * 删除节点
     */
    public function deleteNodes($nodeHashes) {
        $nodes = $this->getAllNodes();
        $filtered = array_filter($nodes, function($node) use ($nodeHashes) {
            return !in_array($node['node_hash'], $nodeHashes);
        });
        
        $deleted = count($nodes) - count($filtered);
        
        file_put_contents($this->dataFile, json_encode(array_values($filtered), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        return $deleted;
    }
    
    /**
     * 获取统计信息
     */
    public function getStats() {
        $nodes = $this->getAllNodes();
        
        $stats = [
            'total' => count($nodes),
            'available' => 0,
            'unavailable' => 0,
            'unchecked' => 0,
            'last_check' => null
        ];
        
        foreach ($nodes as $node) {
            if ($node['available'] === 1) {
                $stats['available']++;
            } elseif ($node['available'] === 0) {
                $stats['unavailable']++;
            } else {
                $stats['unchecked']++;
            }
            
            if ($node['last_check_time'] && (!$stats['last_check'] || $node['last_check_time'] > $stats['last_check'])) {
                $stats['last_check'] = $node['last_check_time'];
            }
        }
        
        return $stats;
    }
    
    /**
     * 生成节点唯一标识
     * 根据节点类型使用不同的唯一键
     */
    private function generateNodeHash($node) {
        $type = $node['type'];
        $server = $node['server'];
        $port = $node['port'];
        
        // 获取原始配置
        $raw = $node['raw'] ?? $node;
        
        // 根据不同类型生成唯一标识
        switch ($type) {
            case 'vless':
                // vless: type + server + port + uuid
                $uuid = $raw['uuid'] ?? '';
                $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $uuid);
                break;
                
            case 'vmess':
                // vmess: type + server + port + uuid
                $uuid = $raw['uuid'] ?? '';
                $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $uuid);
                break;
                
            case 'trojan':
                // trojan: type + server + port + password
                $password = $raw['password'] ?? '';
                $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $password);
                break;
                
            case 'ss':
                // shadowsocks: type + server + port + password
                $password = $raw['password'] ?? '';
                $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $password);
                break;
                
            case 'ssr':
                // shadowsocksr: type + server + port + password
                $password = $raw['password'] ?? '';
                $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $password);
                break;
                
            case 'hysteria2':
                // hysteria2: type + server + port + password/auth
                $password = $raw['password'] ?? $raw['auth'] ?? '';
                $key = sprintf('%s:%s:%d:%s', $type, $server, $port, $password);
                break;
                
            default:
                // 其他类型: type + server + port
                $key = sprintf('%s:%s:%d', $type, $server, $port);
                break;
        }
        
        return md5($key);
    }
    
    /**
     * 记录更新日志
     */
    private function logUpdate($source, $stats) {
        $logs = json_decode(file_get_contents($this->logFile), true) ?: [];
        
        $logs[] = [
            'source' => $source,
            'stats' => $stats,
            'created_at' => time()
        ];
        
        // 只保留最近100条日志
        if (count($logs) > 100) {
            $logs = array_slice($logs, -100);
        }
        
        file_put_contents($this->logFile, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
