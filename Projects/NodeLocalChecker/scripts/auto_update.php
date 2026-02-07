<?php
/**
 * 自动更新节点
 * 从机场聚合器获取最新节点并合并到本地数据库
 */

// 聚合器YAML地址
$aggregatorUrl = 'https://us.liukun.com:8443/Projects/Aggregator/Aggregator.yaml';

// 临时文件路径
$tempFile = __DIR__ . '/../data/temp_aggregator.yaml';

echo "=== 节点自动更新 ===\n";
echo "时间: " . date('Y-m-d H:i:s') . "\n";
echo "来源: $aggregatorUrl\n\n";

try {
    // 1. 下载YAML文件
    echo "[1/4] 下载配置文件...\n";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $aggregatorUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $yamlContent = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$yamlContent) {
        throw new Exception("下载失败 (HTTP $httpCode)");
    }
    
    file_put_contents($tempFile, $yamlContent);
    echo "✓ 下载成功 (" . strlen($yamlContent) . " 字节)\n\n";
    
    // 2. 解析YAML
    echo "[2/4] 解析配置文件...\n";
    $parseScript = __DIR__ . '/../api/parse.php';
    
    // 模拟文件上传
    $_FILES['file'] = [
        'tmp_name' => $tempFile,
        'name' => 'Aggregator.yaml',
        'type' => 'text/yaml',
        'error' => 0,
        'size' => filesize($tempFile)
    ];
    
    ob_start();
    require $parseScript;
    $parseResult = ob_get_clean();
    
    $result = json_decode($parseResult, true);
    
    if (!$result || !$result['success']) {
        throw new Exception('解析失败: ' . ($result['error'] ?? '未知错误'));
    }
    
    $nodes = $result['nodes'];
    echo "✓ 解析成功,找到 " . count($nodes) . " 个节点\n\n";
    
    // 2.5. 过滤广告/无效节点
    echo "[2.5/5] 过滤广告/无效节点...\n";
    $blacklist = [
        '购买', '下单', '官网', '失效',
        '续费', '套餐', '订阅', '充值',
        '客服', '联系', '加群', 'QQ',
        '微信', 'Telegram', 'TG群',
        '过期', '到期', '已到期', '已失效',
        '广告', '推广', '优惠', '折扣',
        '注册', '登录', '网址', 'www.',
        'http://', 'https://', '.com', '.net',
        '机场', '订购', '购物', '商城'
    ];
    
    $originalCount = count($nodes);
    $filteredNodes = [];
    
    foreach ($nodes as $node) {
        $nodeName = $node['name'] ?? '';
        $shouldFilter = false;
        
        foreach ($blacklist as $keyword) {
            if (stripos($nodeName, $keyword) !== false) {
                $shouldFilter = true;
                break;
            }
        }
        
        if (!$shouldFilter) {
            $filteredNodes[] = $node;
        }
    }
    
    $filteredCount = $originalCount - count($filteredNodes);
    if ($filteredCount > 0) {
        echo "✓ 过滤完成: 移除 $filteredCount 个广告/无效节点,剩余 " . count($filteredNodes) . " 个\n\n";
    } else {
        echo "✓ 没有发现广告/无效节点\n\n";
    }
    
    $nodes = $filteredNodes;
    
    // 3. 合并到数据库
    echo "[3/6] 合并节点到数据库...\n";
    require_once __DIR__ . '/../api/storage.php';
    $storage = new NodeStorage();
    
    $stats = $storage->mergeNodes($nodes, 'auto_update');
    
    echo "✓ 合并完成:\n";
    echo "  - 新增: {$stats['added']} 个\n";
    echo "  - 更新: {$stats['updated']} 个\n";
    echo "  - 未变: {$stats['unchanged']} 个\n";
    echo "  - 总计: {$stats['total']} 个\n\n";
    
    // 4. 去重节点
    echo "[4/6] 去重节点...\n";
    $allNodes = $storage->getAllNodes();
    $originalCount = count($allNodes);
    
    // 按服务器地址去重
    $serverMap = [];
    $duplicateHashes = [];
    
    foreach ($allNodes as $node) {
        $server = $node['server'] ?? '';
        if (empty($server)) continue;
        
        if (isset($serverMap[$server])) {
            // 重复节点
            $duplicateHashes[] = $node['node_hash'];
        } else {
            $serverMap[$server] = true;
        }
    }
    
    if (count($duplicateHashes) > 0) {
        $storage->deleteNodes($duplicateHashes);
        $newCount = $originalCount - count($duplicateHashes);
        echo "✓ 去重完成: 删除 " . count($duplicateHashes) . " 个重复节点,剩余 $newCount 个\n\n";
    } else {
        echo "✓ 没有发现重复节点\n\n";
    }
    
    // 5. 清理临时文件
    echo "[5/6] 清理临时文件...\n";
    if (file_exists($tempFile)) {
        unlink($tempFile);
    }
    echo "✓ 清理完成\n\n";
    
    // 6. 再次过滤广告节点(防止数据库中有遗留)
    echo "[6/6] 最终检查和过滤...\n";
    $allNodes = $storage->getAllNodes();
    $beforeCount = count($allNodes);
    
    $cleanNodes = [];
    $blacklistHashes = [];
    
    foreach ($allNodes as $node) {
        $nodeName = $node['name'] ?? '';
        $shouldFilter = false;
        
        foreach ($blacklist as $keyword) {
            if (stripos($nodeName, $keyword) !== false) {
                $shouldFilter = true;
                $blacklistHashes[] = $node['node_hash'];
                break;
            }
        }
        
        if (!$shouldFilter) {
            $cleanNodes[] = $node;
        }
    }
    
    if (count($blacklistHashes) > 0) {
        $storage->deleteNodes($blacklistHashes);
        echo "✓ 最终过滤: 移除 " . count($blacklistHashes) . " 个广告节点\n\n";
    } else {
        echo "✓ 数据库已清洁,无需过滤\n\n";
    }
    
    echo "=== 更新成功 ===\n";
    
} catch (Exception $e) {
    echo "\n✗ 更新失败: " . $e->getMessage() . "\n";
    exit(1);
}
