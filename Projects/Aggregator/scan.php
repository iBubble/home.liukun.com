#!/usr/bin/env php
<?php
/**
 * 独立的扫描脚本
 * 可以通过命令行或 cron 任务运行
 * 
 * 使用方法:
 * php scan.php
 * 或
 * bash -c "cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator && php scan.php > /dev/null 2>&1 &"
 */

define('AGGREGATOR_DIR', __DIR__ . '/external/aggregator');
define('DATA_DIR', __DIR__ . '/data');
define('LOG_FILE', __DIR__ . '/logs/aggregator.log');

// 确保必要目录存在
$dirs = [dirname(LOG_FILE), DATA_DIR];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message\n";
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
    echo $logEntry;
}

function loadNodesFromAggregator() {
    $nodes = [];
    
    // 尝试从 aggregator 的 data 目录读取
    $yamlFile = AGGREGATOR_DIR . '/data/clash.yaml';
    if (file_exists($yamlFile)) {
        $yamlContent = file_get_contents($yamlFile);
        $nodes = parseYamlProxies($yamlContent);
        
        // 复制到项目 data 目录
        copy($yamlFile, DATA_DIR . '/clash.yaml');
    }
    
    // 也尝试读取 proxies.yaml
    $proxiesFile = AGGREGATOR_DIR . '/data/proxies.yaml';
    if (file_exists($proxiesFile) && empty($nodes)) {
        $yamlContent = file_get_contents($proxiesFile);
        $nodes = parseYamlProxies($yamlContent);
        
        copy($proxiesFile, DATA_DIR . '/proxies.yaml');
    }
    
    return $nodes;
}

function parseYamlProxies($yamlContent) {
    $nodes = [];
    $lines = explode("\n", $yamlContent);
    $currentNode = null;
    
    foreach ($lines as $line) {
        $line = trim($line);
        
        // 检测新节点开始
        if (preg_match('/^-\s+name:\s*(.+)$/', $line, $matches)) {
            if ($currentNode) {
                $nodes[] = $currentNode;
            }
            $currentNode = [
                'name' => trim($matches[1], '"\''),
                'type' => 'unknown',
                'server' => '',
                'port' => '',
                'location' => '',
                'status' => 'unknown',
                'delay' => null
            ];
        } elseif ($currentNode) {
            // 解析节点属性
            if (preg_match('/^type:\s*(.+)$/', $line, $matches)) {
                $currentNode['type'] = trim($matches[1]);
            } elseif (preg_match('/^server:\s*(.+)$/', $line, $matches)) {
                $currentNode['server'] = trim($matches[1]);
            } elseif (preg_match('/^port:\s*(.+)$/', $line, $matches)) {
                $currentNode['port'] = trim($matches[1]);
            }
        }
    }
    
    // 添加最后一个节点
    if ($currentNode) {
        $nodes[] = $currentNode;
    }
    
    // 提取位置信息
    foreach ($nodes as &$node) {
        $node['location'] = extractLocation($node['name']);
    }
    
    return $nodes;
}

function extractLocation($name) {
    $patterns = [
        '/🇺🇸|美国|US|USA/i' => '美国',
        '/🇯🇵|日本|JP|Japan/i' => '日本',
        '/🇭🇰|香港|HK|Hong Kong/i' => '香港',
        '/🇸🇬|新加坡|SG|Singapore/i' => '新加坡',
        '/🇰🇷|韩国|KR|Korea/i' => '韩国',
        '/🇬🇧|英国|UK|Britain/i' => '英国',
        '/🇩🇪|德国|DE|Germany/i' => '德国',
        '/🇫🇷|法国|FR|France/i' => '法国',
        '/🇨🇦|加拿大|CA|Canada/i' => '加拿大',
        '/🇦🇺|澳洲|AU|Australia/i' => '澳洲',
    ];
    
    foreach ($patterns as $pattern => $location) {
        if (preg_match($pattern, $name)) {
            return $location;
        }
    }
    
    return '未知';
}

function saveNodes($nodes) {
    $nodesFile = DATA_DIR . '/nodes.json';
    file_put_contents($nodesFile, json_encode($nodes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function updateLastUpdate() {
    $statusFile = DATA_DIR . '/status.json';
    $status = [];
    if (file_exists($statusFile)) {
        $status = json_decode(file_get_contents($statusFile), true) ?: [];
    }
    $status['last_update'] = date('c');
    file_put_contents($statusFile, json_encode($status, JSON_PRETTY_PRINT));
}

// 主程序
try {
    logMessage("=== 开始扫描任务 ===");
    
    // 清空旧的节点数据
    $nodesFile = DATA_DIR . '/nodes.json';
    if (file_exists($nodesFile)) {
        unlink($nodesFile);
        logMessage("已清空旧的节点数据");
    }
    
    // 创建空的节点文件
    file_put_contents($nodesFile, json_encode([], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    chmod($nodesFile, 0666);
    
    // 检查核心是否存在
    if (!is_dir(AGGREGATOR_DIR)) {
        throw new Exception('核心组件未找到: ' . AGGREGATOR_DIR);
    }
    
    $collectScript = AGGREGATOR_DIR . '/subscribe/collect.py';
    if (!file_exists($collectScript)) {
        throw new Exception('扫描脚本未找到: ' . $collectScript);
    }
    
    // 读取代理配置
    $proxyConfig = null;
    $proxyFile = DATA_DIR . '/proxy_config.json';
    if (file_exists($proxyFile)) {
        $proxyConfig = json_decode(file_get_contents($proxyFile), true);
        if ($proxyConfig && $proxyConfig['enable']) {
            logMessage("使用代理: {$proxyConfig['type']}://{$proxyConfig['host']}:{$proxyConfig['port']}");
        }
    }
    
    // 切换到 aggregator 目录
    chdir(AGGREGATOR_DIR);
    putenv('PYTHONPATH=' . AGGREGATOR_DIR);
    
    logMessage("执行 Python 扫描脚本...");
    logMessage("使用直连模式扫描（200线程，爬取模式）");
    
    // 同时使用爬取
    $cmd = "python3 subscribe/collect.py --skip --num 200 --targets clash 2>&1";
    
    // 不启动monitor_scan.php，避免多进程冲突
    // 只在扫描完成后调用一次parse_nodes.py
    
    // 创建实时日志文件
    $realtimeLog = __DIR__ . '/logs/real_scan.log';
    
    // 确保日志目录存在
    $logDir = dirname($realtimeLog);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0775, true);
    }
    
    file_put_contents($realtimeLog, "=== 扫描开始 " . date('Y-m-d H:i:s') . " ===\n");
    chmod($realtimeLog, 0666);
    
    // 执行命令，将输出重定向到实时日志
    $output = [];
    $returnCode = 0;
    exec($cmd . " 2>&1 | tee -a " . escapeshellarg($realtimeLog), $output, $returnCode);
    
    $outputText = implode("\n", $output);
    logMessage("扫描输出:\n" . $outputText);
    
    if ($returnCode !== 0) {
        logMessage("警告: 扫描脚本返回非零状态码: $returnCode");
    }
    
    // 最后一次调用parse_nodes.py来正确解析和过滤节点
    logMessage("开始解析和过滤节点...");
    $parseScript = __DIR__ . '/parse_nodes.py';
    $output = [];
    $returnCode = 0;
    exec("python3 " . escapeshellarg($parseScript) . " 2>&1", $output, $returnCode);
    
    if ($returnCode === 0) {
        // 读取解析后的节点数
        $nodesFile = DATA_DIR . '/nodes.json';
        if (file_exists($nodesFile)) {
            $parsedNodes = json_decode(file_get_contents($nodesFile), true);
            $parsedCount = is_array($parsedNodes) ? count($parsedNodes) : 0;
            logMessage("解析完成，有效节点: $parsedCount 个");
        } else {
            logMessage("警告: 解析后的 nodes.json 不存在");
        }
    } else {
        logMessage("警告: 节点解析失败，输出: " . implode("\n", $output));
    }
    
    logMessage("=== 扫描任务完成 ===");
    
} catch (Exception $e) {
    logMessage("错误: " . $e->getMessage());
    exit(1);
}
?>
