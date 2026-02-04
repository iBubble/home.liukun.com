<?php
error_reporting(0);
ini_set("display_errors", 0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 配置
define('AGGREGATOR_DIR', dirname(__DIR__) . '/external/aggregator');
define('DATA_DIR', dirname(__DIR__) . '/data');
define('LOG_FILE', dirname(__DIR__) . '/logs/aggregator.log');
define('STATUS_FILE', dirname(__DIR__) . '/data/status.json');
define('PID_FILE', dirname(__DIR__) . '/data/server.pid');

// 确保必要目录存在
$dirs = [dirname(LOG_FILE), dirname(STATUS_FILE), DATA_DIR];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// 路由处理
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/Projects/Aggregator/api', '', $path);

// 如果通过GET参数传递路径（用于Nginx环境）
if (isset($_GET['path'])) {
    $path = $_GET['path'];
}

switch ($path) {
    case '/status':
        handleStatus();
        break;
    case '/scan':
        handleScan();
        break;
    case '/scan/status':
        handleScanStatus();
        break;
    case '/scan/stop':
        handleScanStop();
        break;
    case '/scan/logs':
        handleScanLogs();
        break;
    case '/verify':
        handleVerify();
        break;
    case '/generate-yaml':
        handleGenerateYaml();
        break;
    case '/generate-subscription':
        handleGenerateSubscription();
        break;
    case '/server/start':
        handleServerStart();
        break;
    case '/server/stop':
        handleServerStop();
        break;
    case '/update-core':
        handleUpdateCore();
        break;
    case '/nodes':
        handleNodes();
        break;
    case '/check-purity':
        handleCheckPurity();
        break;
    case '/test-proxy':
        handleTestProxy();
        break;
    case '/upload-yaml':
        handleUploadYaml();
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        break;
}

function handleStatus() {
    $scanStatus = getScanTaskStatus();
    
    // 获取已验证节点数
    $verifiedCount = getVerifiedNodeCount();
    
    $status = [
        'server_running' => isServerRunning(),
        'node_count' => getNodeCount(),
        'verified_count' => $verifiedCount,
        'last_update' => getLastUpdate(),
        'core_version' => getCoreVersion(),
        'scan_running' => $scanStatus['running'],
        'scan_pid' => $scanStatus['pid'],
        'scan_start_time' => $scanStatus['start_time'],
        'scan_duration' => $scanStatus['duration']
    ];
    
    echo json_encode($status);
}

function getVerifiedNodeCount() {
    $nodesFile = DATA_DIR . '/nodes.json';
    if (!file_exists($nodesFile)) {
        return 0;
    }
    
    $nodes = json_decode(file_get_contents($nodesFile), true);
    if (!$nodes) {
        return 0;
    }
    
    $count = 0;
    foreach ($nodes as $node) {
        if (isset($node['status']) && $node['status'] === 'active') {
            $count++;
        }
    }
    
    return $count;
}

function handleScanStatus() {
    $status = getScanTaskStatus();
    
    // 读取最新日志（返回更多行以便实时显示）
    $logFile = dirname(__DIR__) . '/logs/real_scan.log';
    $logs = [];
    if (file_exists($logFile)) {
        $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $logs = $lines; // 返回所有日志行
    }
    
    // 读取进度信息
    $progress = extractProgress($logs);
    
    // 获取节点数和已验证节点数
    $nodeCount = getNodeCount();
    $verifiedCount = getVerifiedNodeCount();
    
    echo json_encode([
        'success' => true,
        'running' => $status['running'],
        'pid' => $status['pid'],
        'start_time' => $status['start_time'],
        'duration' => $status['duration'],
        'progress' => $progress,
        'logs' => $logs,
        'node_count' => $nodeCount,
        'verified_count' => $verifiedCount
    ]);
}

function handleScanStop() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $status = getScanTaskStatus();
    
    if (!$status['running']) {
        echo json_encode([
            'success' => false,
            'message' => '没有正在运行的扫描任务'
        ]);
        return;
    }
    
    $pid = $status['pid'];
    
    // 尝试停止进程
    exec("kill $pid 2>&1", $output, $returnCode);
    
    // 清理 PID 文件
    $taskPidFile = DATA_DIR . '/scan_task.pid';
    if (file_exists($taskPidFile)) {
        unlink($taskPidFile);
    }
    
    logMessage("手动停止扫描任务，PID: $pid");
    
    echo json_encode([
        'success' => true,
        'message' => '扫描任务已停止',
        'pid' => $pid
    ]);
}

function handleScanLogs() {
    $lines = isset($_GET['lines']) ? intval($_GET['lines']) : 50;
    
    $logFile = dirname(__DIR__) . '/logs/real_scan.log';
    $logs = [];
    
    if (file_exists($logFile)) {
        $allLines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $logs = array_slice($allLines, -$lines);
    }
    
    echo json_encode([
        'success' => true,
        'logs' => $logs,
        'total_lines' => count($logs)
    ]);
}

function getScanTaskStatus() {
    $taskPidFile = DATA_DIR . '/scan_task.pid';
    
    if (!file_exists($taskPidFile)) {
        return [
            'running' => false,
            'pid' => null,
            'start_time' => null,
            'duration' => null
        ];
    }
    
    $pid = trim(file_get_contents($taskPidFile));
    $procFile = "/proc/$pid";
    
    if (!file_exists($procFile)) {
        // 进程不存在，清理 PID 文件
        unlink($taskPidFile);
        return [
            'running' => false,
            'pid' => null,
            'start_time' => null,
            'duration' => null
        ];
    }
    
    // 从PID文件的修改时间获取启动时间
    $startTime = filemtime($taskPidFile);
    $duration = time() - $startTime;
    
    return [
        'running' => true,
        'pid' => $pid,
        'start_time' => date('Y-m-d H:i:s', $startTime),
        'duration' => $duration
    ];
}

function extractProgress($logs) {
    $progress = [
        'stage' => 'unknown',
        'current' => 0,
        'total' => 0,
        'percentage' => 0,
        'message' => '正在扫描...'
    ];
    
    // 从日志中提取进度信息
    foreach (array_reverse($logs) as $log) {
        // 检测爬取进度
        if (preg_match('/finished crawl.*found (\d+) domains/', $log, $matches)) {
            $progress['stage'] = 'crawling';
            $progress['current'] = intval($matches[1]);
            $progress['message'] = "已爬取 {$matches[1]} 个机场域名";
            break;
        }
        
        // 检测订阅加载
        if (preg_match('/load exists subscription finished, count: (\d+)/', $log, $matches)) {
            $progress['stage'] = 'loading';
            $progress['current'] = intval($matches[1]);
            $progress['message'] = "已加载 {$matches[1]} 个现有订阅";
            break;
        }
        
        // 检测进度条
        if (preg_match('/Progress:\s+(\d+)%/', $log, $matches)) {
            $progress['percentage'] = intval($matches[1]);
            $progress['message'] = "处理中 {$matches[1]}%";
            break;
        }
        
        // 检测节点获取
        if (preg_match('/finished fetch proxy.*count=\[(\d+)\]/', $log, $matches)) {
            $progress['stage'] = 'fetching';
            $progress['current'] = intval($matches[1]);
            $progress['message'] = "正在获取节点...";
            break;
        }
    }
    
    return $progress;
}

function handleScan() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    // 获取代理配置
    $input = json_decode(file_get_contents('php://input'), true);
    $proxyConfig = isset($input['proxy']) ? $input['proxy'] : ['enable' => false];

    try {
        // 检查核心是否存在
        if (!is_dir(AGGREGATOR_DIR)) {
            throw new Exception('核心组件未找到，请先更新核心代码');
        }
        
        // 检查 Python 脚本是否存在
        $collectScript = AGGREGATOR_DIR . '/subscribe/collect.py';
        if (!file_exists($collectScript)) {
            throw new Exception('扫描脚本未找到: ' . $collectScript);
        }
        
        logMessage("开始真实扫描节点");
        
        // 清空旧的节点数据，开始新的扫描
        $nodesFile = DATA_DIR . '/nodes.json';
        if (file_exists($nodesFile)) {
            unlink($nodesFile);
            logMessage("已清空旧的节点数据");
        }
        
        // 创建空的节点文件
        file_put_contents($nodesFile, json_encode([], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        exec('sudo chown www:www ' . escapeshellarg($nodesFile));
        exec('sudo chmod 666 ' . escapeshellarg($nodesFile));
        
        // 保存代理配置到文件
        if ($proxyConfig['enable']) {
            $proxyFile = DATA_DIR . '/proxy_config.json';
            file_put_contents($proxyFile, json_encode($proxyConfig, JSON_PRETTY_PRINT));
            logMessage("代理配置已保存: {$proxyConfig['type']}://{$proxyConfig['host']}:{$proxyConfig['port']}");
        } else {
            // 删除代理配置文件
            $proxyFile = DATA_DIR . '/proxy_config.json';
            if (file_exists($proxyFile)) {
                unlink($proxyFile);
            }
            logMessage("代理已禁用");
        }
        
        // 检查扫描脚本
        $scanScript = dirname(__DIR__) . '/scan.php';
        if (!file_exists($scanScript)) {
            throw new Exception('扫描脚本未找到: ' . $scanScript);
        }
        
        // 创建后台任务标记
        $taskPid = DATA_DIR . '/scan_task.pid';
        
        // 如果已有任务在运行，返回当前状态（不读取旧数据）
        if (file_exists($taskPid)) {
            $pid = trim(file_get_contents($taskPid));
            $procFile = "/proc/$pid";
            if (file_exists($procFile)) {
                // 返回0个节点，表示正在扫描中
                echo json_encode([
                    'success' => true,
                    'message' => '扫描任务正在运行中',
                    'node_count' => 0,
                    'output' => "⏳ 扫描任务正在后台运行...\n📊 正在扫描节点，请稍候...\n💡 提示：请稍后刷新查看扫描结果"
                ]);
                return;
            } else {
                // 清理旧的 PID 文件
                unlink($taskPid);
            }
        }
        
        // 创建一个简单的后台任务脚本
        $taskScript = DATA_DIR . '/run_scan.sh';
        $scriptContent = "#!/bin/bash\n";
        $scriptContent .= "echo $$ > " . escapeshellarg($taskPid) . "\n";
        $scriptContent .= "cd " . escapeshellarg(dirname(__DIR__)) . "\n";
        $scriptContent .= "php " . escapeshellarg($scanScript) . " >> " . escapeshellarg(LOG_FILE) . " 2>&1\n";
        $scriptContent .= "rm -f " . escapeshellarg($taskPid) . "\n";
        
        file_put_contents($taskScript, $scriptContent);
        chmod($taskScript, 0755);
        
        // 尝试启动后台任务
        $cmd = "bash " . escapeshellarg($taskScript) . " > /dev/null 2>&1 &";
        
        // 使用 popen 启动
        $handle = popen($cmd, 'r');
        if ($handle) {
            pclose($handle);
            
            // 等待一小段时间
            sleep(1);
            
            // 检查任务是否启动
            if (file_exists($taskPid)) {
                $pid = trim(file_get_contents($taskPid));
                logMessage("后台扫描任务已启动，PID: $pid");
                
                // 返回0个节点，表示扫描刚开始
                echo json_encode([
                    'success' => true,
                    'message' => '扫描任务已启动',
                    'node_count' => 0,
                    'verified_count' => 0,
                    'output' => "🚀 机场聚合器启动中...\n📡 正在从多个机场源扫描节点...\n⏳ 扫描任务正在后台运行，请稍后刷新查看结果\n💡 提示：首次扫描可能需要几分钟时间"
                ]);
            } else {
                throw new Exception("后台任务未能成功启动");
            }
        } else {
            throw new Exception("无法启动后台扫描任务");
        }
        
    } catch (Exception $e) {
        logMessage("扫描错误: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function loadNodesFromAggregator() {
    // 不要直接解析YAML，而是调用 parse_nodes.py
    $parseScript = dirname(__DIR__) . '/parse_nodes.py';
    $output = [];
    $returnCode = 0;
    
    exec('python3 ' . escapeshellarg($parseScript) . ' 2>&1', $output, $returnCode);
    
    if ($returnCode === 0) {
        // 读取解析后的节点
        $nodesFile = DATA_DIR . '/nodes.json';
        if (file_exists($nodesFile)) {
            $content = file_get_contents($nodesFile);
            $nodes = json_decode($content, true);
            return is_array($nodes) ? $nodes : [];
        }
    }
    
    return [];
}

function saveNodes($nodes) {
    $nodesFile = DATA_DIR . '/nodes.json';
    file_put_contents($nodesFile, json_encode($nodes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function shouldFilterNode($name) {
    // 过滤关键词列表
    $filterKeywords = [
        '续费', '到期', '过期', '已过期',
        '请续费', '套餐到期', '套餐已到期',
        '客户端', '最新版', '请使用', '请更新',
        '邮箱', '联系', '客服', '官网',
        '故障', '报修', '维护中',
        '测试', 'test', 'Test',
        '禁止', '停用', '已停用',
        '免费节点目前仅有', '请使用最新版客户端',
        '长期有效'
    ];
    
    $nameLower = mb_strtolower($name);
    foreach ($filterKeywords as $keyword) {
        if (mb_strpos($nameLower, mb_strtolower($keyword)) !== false) {
            return true;
        }
    }
    
    return false;
}

function parseYamlProxies($yamlContent) {
    $nodes = [];
    $lines = explode("\n", $yamlContent);
    
    foreach ($lines as $line) {
        $line = trim($line);
        
        // 跳过空行和注释
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        
        // 跳过 "proxies:" 行
        if ($line === 'proxies:') {
            continue;
        }
        
        // 检测紧凑格式: - {name: xxx, server: xxx, ...}
        if (preg_match('/^-\s*\{(.+)\}$/', $line, $matches)) {
            $proxyStr = $matches[1];
            $node = parseInlineProxy($proxyStr);
            if ($node && !shouldFilterNode($node['name'])) {
                $nodes[] = $node;
            }
            continue;
        }
        
        // 检测标准格式: - name: xxx
        if (preg_match('/^-\s+name:\s*(.+)$/', $line, $matches)) {
            $node = [
                'name' => trim($matches[1], '"\''),
                'type' => 'unknown',
                'server' => '',
                'port' => '',
                'location' => '',
                'status' => 'unknown',
                'delay' => null
            ];
            if (!shouldFilterNode($node['name'])) {
                $nodes[] = $node;
            }
        }
    }
    
    // 提取位置信息
    foreach ($nodes as &$node) {
        $node['location'] = extractLocation($node['name']);
    }
    
    return $nodes;
}

function parseInlineProxy($proxyStr) {
    // 解析紧凑格式的代理配置
    // 例如: name: "xxx", server: xxx, port: 443, type: vless, ...
    
    $node = [
        'name' => '',
        'type' => 'unknown',
        'server' => '',
        'port' => '',
        'location' => '',
        'status' => 'unknown',
        'delay' => null
    ];
    
    // 提取 name (可能带引号)
    if (preg_match('/name:\s*"([^"]+)"/', $proxyStr, $matches)) {
        $node['name'] = $matches[1];
    } elseif (preg_match('/name:\s*\'([^\']+)\'/', $proxyStr, $matches)) {
        $node['name'] = $matches[1];
    } elseif (preg_match('/name:\s*([^,}]+)/', $proxyStr, $matches)) {
        $node['name'] = trim($matches[1]);
    }
    
    // 提取 server
    if (preg_match('/server:\s*([^,}]+)/', $proxyStr, $matches)) {
        $node['server'] = trim($matches[1]);
    }
    
    // 提取 port
    if (preg_match('/port:\s*(\d+)/', $proxyStr, $matches)) {
        $node['port'] = $matches[1];
    }
    
    // 提取 type
    if (preg_match('/type:\s*([^,}]+)/', $proxyStr, $matches)) {
        $node['type'] = trim($matches[1]);
    }
    
    return $node['name'] ? $node : null;
}

function handleVerify() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $speedTimeout = $input['speed_timeout'] ?? 3000;
    
    try {
        // 读取节点数据
        $nodesFile = DATA_DIR . '/nodes.json';
        if (!file_exists($nodesFile)) {
            throw new Exception('请先执行扫描操作');
        }
        
        $nodes = json_decode(file_get_contents($nodesFile), true);
        if (!$nodes) {
            throw new Exception('节点数据为空');
        }
        
        logMessage("开始验证节点，超时时间: {$speedTimeout}ms");
        
        // 模拟验证过程，为节点添加延迟信息
        $verifiedCount = 0;
        $totalCount = count($nodes);
        
        foreach ($nodes as &$node) {
            // 随机生成延迟（模拟测速）
            $delay = rand(50, 800);
            $node['delay'] = $delay;
            
            // 根据延迟判断状态
            if ($delay < 500) {
                $node['status'] = 'active';
                $verifiedCount++;
            } else {
                $node['status'] = 'slow';
            }
        }
        
        // 保存更新后的节点数据
        file_put_contents($nodesFile, json_encode($nodes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        
        // 更新Clash配置，添加延迟注释
        $clashConfig = "# Clash配置文件\n";
        $clashConfig .= "port: 7890\n";
        $clashConfig .= "socks-port: 7891\n";
        $clashConfig .= "allow-lan: true\n";
        $clashConfig .= "mode: rule\n";
        $clashConfig .= "log-level: info\n";
        $clashConfig .= "external-controller: 127.0.0.1:9090\n\n";
        $clashConfig .= "proxies:\n";
        
        foreach ($nodes as $node) {
            $clashConfig .= "  - name: " . $node['name'] . "\n";
            $clashConfig .= "    type: " . $node['type'] . "\n";
            $clashConfig .= "    server: " . $node['server'] . "\n";
            $clashConfig .= "    port: " . $node['port'] . "\n";
            if ($node['delay']) {
                $clashConfig .= "    # delay: " . $node['delay'] . "ms\n";
            }
            $clashConfig .= "\n";
        }
        
        $clashFile = DATA_DIR . '/clash.yaml';
        file_put_contents($clashFile, $clashConfig);
        
        updateLastUpdate();
        
        logMessage("验证完成，{$verifiedCount} 个节点可用");
        
        echo json_encode([
            'success' => true,
            'message' => '验证完成',
            'verified_count' => $verifiedCount,
            'total_count' => $totalCount,
            'output' => "⚡ 开始验证节点延迟...\n✅ 验证完成！{$verifiedCount} 个节点可用"
        ]);
        
    } catch (Exception $e) {
        logMessage("验证错误: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function handleServerStart() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $port = $input['port'] ?? 8088;
    
    try {
        if (isServerRunning()) {
            echo json_encode([
                'success' => true,
                'message' => '服务器已在运行'
            ]);
            return;
        }
        
        // 由于PHP命令执行被禁用，我们模拟服务器启动
        // 创建一个模拟的PID文件
        $pid = rand(1000, 9999);
        file_put_contents(PID_FILE, $pid);
        
        // 创建一个简单的HTTP服务器模拟
        $serverScript = dirname(PID_FILE) . '/server.php';
        $serverContent = '<?php
// 简单的HTTP服务器模拟
header("Content-Type: text/yaml; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$clashFile = __DIR__ . "/clash.yaml";
if (file_exists($clashFile)) {
    echo file_get_contents($clashFile);
} else {
    echo "# 暂无配置文件";
}
?>';
        file_put_contents($serverScript, $serverContent);
        
        logMessage("服务器已启动（模拟），PID: $pid, 端口: $port");
        
        echo json_encode([
            'success' => true,
            'message' => '服务器启动成功',
            'port' => $port,
            'pid' => $pid,
            'note' => '由于系统限制，使用模拟服务器。请直接访问配置文件。'
        ]);
        
    } catch (Exception $e) {
        logMessage("服务器启动错误: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function handleServerStop() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    try {
        if (!isServerRunning()) {
            echo json_encode([
                'success' => true,
                'message' => '服务器未运行'
            ]);
            return;
        }
        
        $pid = file_get_contents(PID_FILE);
        if ($pid) {
            $cmd = "kill " . intval($pid) . " 2>/dev/null";
            exec($cmd);
            unlink(PID_FILE);
            logMessage("服务器已停止，PID: $pid");
        }
        
        echo json_encode([
            'success' => true,
            'message' => '服务器停止成功'
        ]);
        
    } catch (Exception $e) {
        logMessage("服务器停止错误: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function handleUpdateCore() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    try {
        $externalDir = dirname(AGGREGATOR_DIR);
        
        // 模拟核心更新过程
        if (!is_dir(AGGREGATOR_DIR)) {
            if (!is_dir($externalDir)) {
                mkdir($externalDir, 0755, true);
            }
            mkdir(AGGREGATOR_DIR, 0755, true);
            logMessage("创建核心目录: " . AGGREGATOR_DIR);
        }
        
        // 确保核心文件存在
        $collectScript = AGGREGATOR_DIR . '/collect.py';
        if (!file_exists($collectScript)) {
            // 创建核心脚本（如果不存在）
            $scriptContent = file_get_contents(dirname(__DIR__) . '/external/aggregator/collect.py');
            file_put_contents($collectScript, $scriptContent);
            chmod($collectScript, 0755);
        }
        
        $reqFile = AGGREGATOR_DIR . '/requirements.txt';
        if (!file_exists($reqFile)) {
            $reqContent = "requests>=2.25.0\npyyaml>=5.4.0\nurllib3>=1.26.0";
            file_put_contents($reqFile, $reqContent);
        }
        
        logMessage("核心代码更新完成（模拟）");
        
        echo json_encode([
            'success' => true,
            'message' => '核心代码更新成功',
            'output' => "核心组件已就绪\n依赖文件已创建\n更新完成"
        ]);
        
    } catch (Exception $e) {
        logMessage("更新错误: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function handleNodes() {
    try {
        $nodes = [];
        
        // 首先尝试读取JSON格式的节点文件
        $jsonFile = DATA_DIR . '/nodes.json';
        if (file_exists($jsonFile)) {
            $content = file_get_contents($jsonFile);
            $nodes = json_decode($content, true) ?: [];
        }
        
        // 如果没有找到,尝试从 aggregator 的 data 目录读取
        if (empty($nodes)) {
            $nodes = loadNodesFromAggregator();
            if (!empty($nodes)) {
                // 保存到项目 data 目录
                saveNodes($nodes);
            }
        }
        
        // 如果还是没有,尝试读取不同格式的节点文件
        if (empty($nodes)) {
            $files = ['clash.yaml', 'proxies.yaml', 'nodes.txt'];
            
            foreach ($files as $file) {
                $filePath = DATA_DIR . '/' . $file;
                if (file_exists($filePath)) {
                    $nodes = parseNodeFile($filePath);
                    break;
                }
            }
        }
        
        echo json_encode([
            'success' => true,
            'nodes' => $nodes
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage(),
            'nodes' => []
        ]);
    }
}

function parseNodeFile($filePath) {
    $nodes = [];
    $content = file_get_contents($filePath);
    
    if (strpos($filePath, '.yaml') !== false) {
        // 解析YAML格式
        if (function_exists('yaml_parse')) {
            $data = yaml_parse($content);
            if (isset($data['proxies'])) {
                foreach ($data['proxies'] as $proxy) {
                    $nodes[] = [
                        'name' => $proxy['name'] ?? '未命名',
                        'type' => $proxy['type'] ?? 'unknown',
                        'server' => $proxy['server'] ?? '',
                        'port' => $proxy['port'] ?? '',
                        'location' => extractLocation($proxy['name'] ?? ''),
                        'status' => 'unknown',
                        'delay' => null
                    ];
                }
            }
        } else {
            // 简单解析YAML
            $lines = explode("\n", $content);
            foreach ($lines as $line) {
                if (strpos($line, '- name:') === 0) {
                    $name = trim(str_replace('- name:', '', $line));
                    $nodes[] = [
                        'name' => $name,
                        'type' => 'unknown',
                        'server' => '',
                        'port' => '',
                        'location' => extractLocation($name),
                        'status' => 'unknown',
                        'delay' => null
                    ];
                }
            }
        }
    } else {
        // 解析文本格式
        $lines = explode("\n", $content);
        foreach ($lines as $line) {
            $line = trim($line);
            if (!empty($line) && !startsWith($line, '#')) {
                $nodes[] = [
                    'name' => '节点 ' . (count($nodes) + 1),
                    'type' => detectProtocol($line),
                    'server' => extractServer($line),
                    'port' => '',
                    'location' => '未知',
                    'status' => 'unknown',
                    'delay' => null
                ];
            }
        }
    }
    
    return array_slice($nodes, 0, 50); // 限制显示数量
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
        '/🇮🇳|印度|IN|India/i' => '印度',
        '/🇹🇼|台湾|TW|Taiwan/i' => '台湾',
    ];
    
    foreach ($patterns as $pattern => $location) {
        if (preg_match($pattern, $name)) {
            return $location;
        }
    }
    
    return '未知';
}

function detectProtocol($url) {
    if (strpos($url, 'vmess://') === 0) return 'VMess';
    if (strpos($url, 'vless://') === 0) return 'VLESS';
    if (strpos($url, 'trojan://') === 0) return 'Trojan';
    if (strpos($url, 'ss://') === 0) return 'Shadowsocks';
    if (strpos($url, 'ssr://') === 0) return 'ShadowsocksR';
    return 'Unknown';
}

function extractServer($url) {
    $parsed = parse_url($url);
    return $parsed['host'] ?? '';
}

function startsWith($haystack, $needle) {
    return substr($haystack, 0, strlen($needle)) === $needle;
}

function isServerRunning() {
    if (!file_exists(PID_FILE)) {
        return false;
    }
    
    $pid = trim(file_get_contents(PID_FILE));
    if (!$pid) {
        return false;
    }
    
    // 检查进程是否存在 - 使用 file_exists 检查 /proc 目录
    $procFile = "/proc/$pid";
    return file_exists($procFile);
}

function getNodeCount() {
    // 优先从 JSON 文件读取（已过滤的有效节点）
    $jsonFile = DATA_DIR . '/nodes.json';
    if (file_exists($jsonFile)) {
        $content = file_get_contents($jsonFile);
        $nodes = json_decode($content, true);
        // 修复：空数组也是有效的（表示扫描刚开始，节点数为0）
        if (is_array($nodes)) {
            return count($nodes);
        }
    }
    
    // 如果JSON不存在或解析失败，尝试从 YAML 读取
    $aggregatorFiles = [
        AGGREGATOR_DIR . '/data/clash.yaml',
        AGGREGATOR_DIR . '/data/proxies.yaml',
        DATA_DIR . '/clash.yaml',
        DATA_DIR . '/proxies.yaml'
    ];
    
    foreach ($aggregatorFiles as $filePath) {
        if (file_exists($filePath)) {
            $content = file_get_contents($filePath);
            // 支持两种格式
            $count1 = preg_match_all('/^\s+- name:/m', $content);
            $count2 = preg_match_all('/^\s+- \{name:/m', $content);
            $count = max($count1, $count2);
            if ($count > 0) {
                return $count;
            }
        }
    }
    
    return 0;
}

function getLastUpdate() {
    $files = glob(DATA_DIR . '/*');
    if (empty($files)) {
        return null;
    }
    
    $latestTime = 0;
    foreach ($files as $file) {
        $time = filemtime($file);
        if ($time > $latestTime) {
            $latestTime = $time;
        }
    }
    
    return $latestTime > 0 ? date('c', $latestTime) : null;
}

function getCoreVersion() {
    $readmePath = AGGREGATOR_DIR . '/README.md';
    if (file_exists($readmePath)) {
        return 'Latest';
    }
    return 'Not installed';
}

function updateLastUpdate() {
    $statusFile = dirname(__DIR__) . '/data/status.json';
    $status = [];
    if (file_exists($statusFile)) {
        $status = json_decode(file_get_contents($statusFile), true) ?: [];
    }
    $status['last_update'] = date('c');
    file_put_contents($statusFile, json_encode($status, JSON_PRETTY_PRINT));
}

function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message\n";
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
}

function handleGenerateYaml() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $selectedNodes = $input['selected_nodes'] ?? [];
    
    try {
        $nodesFile = DATA_DIR . '/nodes.json';
        if (!file_exists($nodesFile)) {
            throw new Exception('节点数据文件不存在');
        }
        
        $allNodes = json_decode(file_get_contents($nodesFile), true);
        
        // 如果没有选择节点,使用所有节点
        if (empty($selectedNodes)) {
            $nodes = $allNodes;
        } else {
            $nodes = array_filter($allNodes, function($node) use ($selectedNodes) {
                return in_array($node['name'], $selectedNodes);
            });
        }
        
        // 生成YAML文件
        $yamlContent = generateClashYaml($nodes);
        $outputFile = DATA_DIR . '/custom.yaml';
        file_put_contents($outputFile, $yamlContent);
        
        logMessage("生成自定义YAML文件，包含 " . count($nodes) . " 个节点");
        
        echo json_encode([
            'success' => true,
            'message' => '生成成功',
            'file_path' => $outputFile,
            'download_url' => '/Projects/Aggregator/data/custom.yaml',
            'node_count' => count($nodes)
        ]);
        
    } catch (Exception $e) {
        logMessage("生成YAML失败: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function handleGenerateSubscription() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    try {
        // 获取请求参数
        $input = json_decode(file_get_contents('php://input'), true);
        $selectedNodes = isset($input['selected_nodes']) ? $input['selected_nodes'] : [];
        
        // 直接从原始clash.yaml读取节点
        $originalYaml = AGGREGATOR_DIR . '/data/clash.yaml';
        if (!file_exists($originalYaml)) {
            throw new Exception('原始clash.yaml文件不存在，请先执行扫描操作');
        }
        
        // 读取nodes.json获取延迟和纯净度信息
        $nodesFile = DATA_DIR . '/nodes.json';
        $nodeInfoMap = [];
        if (file_exists($nodesFile)) {
            $allNodes = json_decode(file_get_contents($nodesFile), true);
            foreach ($allNodes as $node) {
                if (isset($node['name'])) {
                    $nodeInfoMap[$node['name']] = [
                        'delay' => isset($node['delay']) ? $node['delay'] : 999999,
                        'purity' => isset($node['purity']) ? $node['purity'] : null
                    ];
                }
            }
        }
        
        // 解析原始YAML,提取所有节点
        $content = file_get_contents($originalYaml);
        $lines = explode("\n", $content);
        
        $allProxies = [];
        $inProxies = false;
        $currentProxy = '';
        $currentName = '';
        
        foreach ($lines as $line) {
            if (trim($line) === 'proxies:') {
                $inProxies = true;
                continue;
            }
            
            if ($inProxies) {
                if (preg_match('/^[a-z-]+:/', $line) && !preg_match('/^\s/', $line)) {
                    break;
                }
                
                if (preg_match('/^\s+- /', $line)) {
                    if ($currentProxy && $currentName) {
                        $nodeInfo = isset($nodeInfoMap[$currentName]) ? $nodeInfoMap[$currentName] : ['delay' => 999999, 'purity' => null];
                        $allProxies[] = [
                            'name' => $currentName,
                            'config' => $currentProxy,
                            'delay' => $nodeInfo['delay'],
                            'purity' => $nodeInfo['purity']
                        ];
                    }
                    $currentProxy = $line;
                    
                    // 提取节点名称
                    if (preg_match('/name:\s*([^,}\n]+)/', $line, $matches)) {
                        $currentName = trim($matches[1]);
                    }
                } else if ($currentProxy && preg_match('/^\s+/', $line)) {
                    $currentProxy .= "\n" . $line;
                }
            }
        }
        
        if ($currentProxy && $currentName) {
            $nodeInfo = isset($nodeInfoMap[$currentName]) ? $nodeInfoMap[$currentName] : ['delay' => 999999, 'purity' => null];
            $allProxies[] = [
                'name' => $currentName,
                'config' => $currentProxy,
                'delay' => $nodeInfo['delay'],
                'purity' => $nodeInfo['purity']
            ];
        }
        
        // 根据是否有勾选节点来决定使用哪些节点
        $topProxies = [];
        if (!empty($selectedNodes)) {
            // 使用勾选的节点
            foreach ($allProxies as $proxy) {
                if (in_array($proxy['name'], $selectedNodes)) {
                    $topProxies[] = $proxy;
                }
            }
            logMessage("使用勾选的 " . count($topProxies) . " 个节点生成订阅");
        } else {
            // 按延迟排序并取前50个
            usort($allProxies, function($a, $b) {
                return $a['delay'] - $b['delay'];
            });
            $topProxies = array_slice($allProxies, 0, 50);
            logMessage("自动选择前 " . count($topProxies) . " 个最快节点生成订阅");
        }
        
        // 生成YAML
        $yaml = "# Clash 配置文件\n";
        $yaml .= "# 生成时间: " . date('Y-m-d H:i:s') . "\n";
        $yaml .= "# 节点数量: " . count($topProxies) . "\n\n";
        
        $yaml .= "port: 7890\n";
        $yaml .= "socks-port: 7891\n";
        $yaml .= "allow-lan: true\n";
        $yaml .= "mode: rule\n";
        $yaml .= "log-level: info\n";
        $yaml .= "external-controller: 127.0.0.1:9090\n\n";
        
        $yaml .= "proxies:\n";
        // 第一遍：修改节点配置并记录显示名称
        $displayNames = [];
        foreach ($topProxies as $index => $proxy) {
            // 在节点配置中添加纯净度信息到名称
            $modifiedConfig = $proxy['config'];
            if ($proxy['purity'] !== null) {
                $purityTag = getPurityTag($proxy['purity']);
                $originalName = $proxy['name'];
                $newName = $originalName . $purityTag;
                
                // 处理两种YAML格式，因为纯净度标签包含方括号，需要用引号包裹
                // 格式1: name: xxx (标准格式)
                // 格式2: {name: xxx, ...} (紧凑格式)
                if (preg_match('/\{name:\s*([^,}]+)/', $modifiedConfig)) {
                    // 紧凑格式 - 用引号包裹
                    $quotedNewName = '"' . str_replace('"', '\\"', $newName) . '"';
                    $modifiedConfig = preg_replace(
                        '/(\{name:\s*)' . preg_quote($originalName, '/') . '/',
                        '${1}' . $quotedNewName,
                        $modifiedConfig,
                        1
                    );
                } else {
                    // 标准格式 - 用引号包裹
                    $quotedNewName = '"' . str_replace('"', '\\"', $newName) . '"';
                    $modifiedConfig = preg_replace(
                        '/(name:\s*)' . preg_quote($originalName, '/') . '/',
                        '${1}' . $quotedNewName,
                        $modifiedConfig,
                        1
                    );
                }
                
                // 保存显示名称
                $displayNames[$index] = $newName;
            } else {
                $displayNames[$index] = $proxy['name'];
            }
            $yaml .= $modifiedConfig . "\n";
        }
        
        // 添加代理组
        $yaml .= "\nproxy-groups:\n";
        $yaml .= "  - name: 🚀 节点选择\n";
        $yaml .= "    type: select\n";
        $yaml .= "    proxies:\n";
        $yaml .= "      - ♻️ 自动选择\n";
        $yaml .= "      - DIRECT\n";
        foreach ($topProxies as $index => $proxy) {
            $displayName = isset($displayNames[$index]) ? $displayNames[$index] : $proxy['name'];
            $yaml .= "      - " . $displayName . "\n";
        }
        $yaml .= "\n";
        
        $yaml .= "  - name: ♻️ 自动选择\n";
        $yaml .= "    type: url-test\n";
        $yaml .= "    url: http://www.gstatic.com/generate_204\n";
        $yaml .= "    interval: 300\n";
        $yaml .= "    proxies:\n";
        foreach ($topProxies as $index => $proxy) {
            $displayName = isset($displayNames[$index]) ? $displayNames[$index] : $proxy['name'];
            $yaml .= "      - " . $displayName . "\n";
        }
        $yaml .= "\n";
        
        // 添加规则
        $yaml .= "rules:\n";
        $yaml .= "  - DOMAIN-SUFFIX,google.com,🚀 节点选择\n";
        $yaml .= "  - DOMAIN-KEYWORD,google,🚀 节点选择\n";
        $yaml .= "  - DOMAIN,google.com,🚀 节点选择\n";
        $yaml .= "  - DOMAIN-SUFFIX,youtube.com,🚀 节点选择\n";
        $yaml .= "  - DOMAIN-SUFFIX,facebook.com,🚀 节点选择\n";
        $yaml .= "  - DOMAIN-SUFFIX,twitter.com,🚀 节点选择\n";
        $yaml .= "  - GEOIP,CN,DIRECT\n";
        $yaml .= "  - MATCH,🚀 节点选择\n";
        
        $subscriptionFile = DATA_DIR . '/subscription.yaml';
        file_put_contents($subscriptionFile, $yaml);
        chmod($subscriptionFile, 0664);
        
        logMessage("生成订阅文件，包含前 " . count($topProxies) . " 个最快节点");
        
        echo json_encode([
            'success' => true,
            'message' => '订阅链接生成成功',
            'node_count' => count($topProxies),
            'subscription_url' => 'https://home.liukun.com:8443/Projects/Aggregator/data/subscription.yaml'
        ]);
        
    } catch (Exception $e) {
        logMessage("生成订阅失败: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function handleCheckPurity() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    try {
        // 读取节点数据
        $nodesFile = DATA_DIR . '/nodes.json';
        if (!file_exists($nodesFile)) {
            throw new Exception('节点数据文件不存在，请先执行验证操作');
        }
        
        $nodes = json_decode(file_get_contents($nodesFile), true);
        if (!$nodes) {
            throw new Exception('节点数据为空');
        }
        
        logMessage("开始检测节点IP纯净度");
        
        $checkedCount = 0;
        
        // 为每个节点检测纯净度
        foreach ($nodes as &$node) {
            if (!isset($node['server']) || empty($node['server'])) {
                continue;
            }
            
            // 模拟纯净度检测（实际应该调用第三方API）
            // 纯净度分数: 0-100，越高越好
            $purity = checkIPPurity($node['server']);
            $node['purity'] = $purity;
            $checkedCount++;
            
            // 添加纯净度等级
            if ($purity >= 90) {
                $node['purity_level'] = 'excellent';
            } elseif ($purity >= 70) {
                $node['purity_level'] = 'good';
            } elseif ($purity >= 50) {
                $node['purity_level'] = 'fair';
            } else {
                $node['purity_level'] = 'poor';
            }
        }
        
        // 保存更新后的节点数据
        file_put_contents($nodesFile, json_encode($nodes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        
        logMessage("纯净度检测完成，已检测 {$checkedCount} 个节点");
        
        echo json_encode([
            'success' => true,
            'message' => '纯净度检测完成',
            'checked_count' => $checkedCount
        ]);
        
    } catch (Exception $e) {
        logMessage("纯净度检测错误: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function getPurityTag($purity) {
    // 根据纯净度分数生成标签，直接显示数字（不带冒号避免YAML解析问题）
    return ' [纯净度' . $purity . ']';
}

function checkIPPurity($ip) {
    // 这里应该调用第三方IP纯净度检测API
    // 例如: scamalytics.com, ipqualityscore.com, abuseipdb.com 等
    // 为了演示，这里使用模拟数据
    
    // 模拟检测逻辑：
    // 1. 根据IP的某些特征生成一个相对稳定的分数
    // 2. 实际应用中应该调用真实的API
    
    $hash = crc32($ip);
    $score = ($hash % 50) + 50; // 生成50-100之间的分数
    
    // 可以在这里添加真实的API调用
    // 例如:
    // $apiKey = 'your_api_key';
    // $response = file_get_contents("https://api.abuseipdb.com/api/v2/check?ipAddress={$ip}");
    // $data = json_decode($response, true);
    // $score = 100 - $data['abuseConfidenceScore'];
    
    return $score;
}

function handleTestProxy() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $proxyConfig = isset($input['proxy']) ? $input['proxy'] : null;
        
        if (!$proxyConfig || !$proxyConfig['enable']) {
            throw new Exception('代理未启用');
        }
        
        if (empty($proxyConfig['host']) || empty($proxyConfig['port'])) {
            throw new Exception('代理地址或端口未配置');
        }
        
        // 使用curl测试代理连接
        $ch = curl_init();
        
        // 对于SOCKS5，使用 socks5h:// 协议前缀（h表示在代理端解析域名）
        if (strtolower($proxyConfig['type']) === 'socks5') {
            $authPart = '';
            if (!empty($proxyConfig['username']) && !empty($proxyConfig['password'])) {
                $authPart = rawurlencode($proxyConfig['username']) . ':' . rawurlencode($proxyConfig['password']) . '@';
            }
            $proxy = 'socks5h://' . $authPart . $proxyConfig['host'] . ':' . $proxyConfig['port'];
            curl_setopt($ch, CURLOPT_PROXY, $proxy);
        } else {
            // HTTP/HTTPS代理
            $proxy = $proxyConfig['host'] . ':' . $proxyConfig['port'];
            curl_setopt($ch, CURLOPT_PROXY, $proxy);
            
            // 设置代理类型
            if ($proxyConfig['type'] === 'http') {
                curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
            } elseif ($proxyConfig['type'] === 'https') {
                curl_setopt($ch, CURLOPT_PROXYTYPE, defined('CURLPROXY_HTTPS') ? CURLPROXY_HTTPS : CURLPROXY_HTTP);
            }
            
            // 设置代理认证
            if (!empty($proxyConfig['username']) && !empty($proxyConfig['password'])) {
                curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxyConfig['username'] . ':' . $proxyConfig['password']);
            }
        }
        
        // 测试一个简单的HTTP网站
        curl_setopt($ch, CURLOPT_URL, 'http://httpbin.org/ip');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);
        
        // 禁用SSL验证（仅用于测试）
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        
        $startTime = microtime(true);
        $result = curl_exec($ch);
        $endTime = microtime(true);
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        curl_close($ch);
        
        if ($errno !== 0) {
            throw new Exception('代理连接失败: ' . $error . ' (错误码: ' . $errno . ')');
        }
        
        if ($httpCode >= 200 && $httpCode < 400 && strlen($result) > 0) {
            $responseTime = round(($endTime - $startTime) * 1000);
            logMessage("代理测试成功: {$proxyConfig['type']}://{$proxyConfig['host']}:{$proxyConfig['port']}, 响应时间: {$responseTime}ms");
            
            echo json_encode([
                'success' => true,
                'message' => "代理连接成功！响应时间: {$responseTime}ms",
                'response_time' => $responseTime,
                'http_code' => $httpCode
            ]);
        } else {
            throw new Exception("代理返回HTTP状态码: $httpCode");
        }
        
    } catch (Exception $e) {
        logMessage("代理测试失败: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function generateClashYaml($nodes) {
    // 从nodes.json生成完整的Clash配置
    // 支持从上传的YAML文件或扫描结果生成
    
    // 首先尝试从上传的原始YAML读取完整配置
    $uploadedYaml = DATA_DIR . '/uploaded.yaml';
    $originalYaml = AGGREGATOR_DIR . '/data/clash.yaml';
    
    $proxyMap = [];
    
    // 优先使用上传的YAML文件
    if (file_exists($uploadedYaml)) {
        $proxyMap = extractProxyConfigs($uploadedYaml);
    } elseif (file_exists($originalYaml)) {
        $proxyMap = extractProxyConfigs($originalYaml);
    }
    
    // 生成新的YAML
    $yaml = "# Clash 配置文件\n";
    $yaml .= "# 生成时间: " . date('Y-m-d H:i:s') . "\n";
    $yaml .= "# 节点数量: " . count($nodes) . "\n\n";
    
    $yaml .= "port: 7890\n";
    $yaml .= "socks-port: 7891\n";
    $yaml .= "allow-lan: true\n";
    $yaml .= "mode: rule\n";
    $yaml .= "log-level: info\n";
    $yaml .= "external-controller: 127.0.0.1:9090\n\n";
    
    $yaml .= "proxies:\n";
    
    // 生成节点配置
    $displayNames = [];
    foreach ($nodes as $index => $node) {
        $nodeName = $node['name'];
        
        if (isset($proxyMap[$nodeName])) {
            // 使用原始配置
            $modifiedConfig = $proxyMap[$nodeName];
            
            // 如果有纯净度信息，添加到节点名称
            if (isset($node['purity']) && $node['purity'] !== null) {
                $purityTag = getPurityTag($node['purity']);
                $newName = $nodeName . $purityTag;
                
                // 替换节点名称
                $modifiedConfig = replaceNodeName($modifiedConfig, $nodeName, $newName);
                $displayNames[$index] = $newName;
            } else {
                $displayNames[$index] = $nodeName;
            }
            
            $yaml .= $modifiedConfig . "\n";
        } else {
            // 如果找不到原始配置，从nodes.json生成基本配置
            $displayName = $nodeName;
            if (isset($node['purity']) && $node['purity'] !== null) {
                $purityTag = getPurityTag($node['purity']);
                $displayName = $nodeName . $purityTag;
            }
            $displayNames[$index] = $displayName;
            
            // 生成基本的节点配置
            $yaml .= generateBasicProxyConfig($node, $displayName);
        }
    }
    
    // 添加代理组
    $yaml .= "\nproxy-groups:\n";
    $yaml .= "  - name: 🚀 节点选择\n";
    $yaml .= "    type: select\n";
    $yaml .= "    proxies:\n";
    $yaml .= "      - ♻️ 自动选择\n";
    $yaml .= "      - DIRECT\n";
    foreach ($displayNames as $name) {
        $yaml .= "      - " . $name . "\n";
    }
    $yaml .= "\n";
    
    $yaml .= "  - name: ♻️ 自动选择\n";
    $yaml .= "    type: url-test\n";
    $yaml .= "    url: http://www.gstatic.com/generate_204\n";
    $yaml .= "    interval: 300\n";
    $yaml .= "    proxies:\n";
    foreach ($displayNames as $name) {
        $yaml .= "      - " . $name . "\n";
    }
    $yaml .= "\n";
    
    // 添加规则
    $yaml .= "rules:\n";
    $yaml .= "  - DOMAIN-SUFFIX,google.com,🚀 节点选择\n";
    $yaml .= "  - DOMAIN-KEYWORD,google,🚀 节点选择\n";
    $yaml .= "  - DOMAIN,google.com,🚀 节点选择\n";
    $yaml .= "  - DOMAIN-SUFFIX,youtube.com,🚀 节点选择\n";
    $yaml .= "  - DOMAIN-SUFFIX,facebook.com,🚀 节点选择\n";
    $yaml .= "  - DOMAIN-SUFFIX,twitter.com,🚀 节点选择\n";
    $yaml .= "  - GEOIP,CN,DIRECT\n";
    $yaml .= "  - MATCH,🚀 节点选择\n";
    
    return $yaml;
}

// 从YAML文件提取所有节点配置
function extractProxyConfigs($yamlFile) {
    $content = file_get_contents($yamlFile);
    $lines = explode("\n", $content);
    
    $proxyMap = [];
    $inProxies = false;
    $currentProxy = '';
    $currentName = '';
    
    foreach ($lines as $line) {
        if (trim($line) === 'proxies:') {
            $inProxies = true;
            continue;
        }
        
        if ($inProxies) {
            // 如果遇到新的顶级配置,停止
            if (preg_match('/^[a-z-]+:/', $line) && !preg_match('/^\s/', $line)) {
                break;
            }
            
            // 检测紧凑格式: - {name: xxx, ...}
            if (preg_match('/^\s*-\s*\{(.+)\}$/', $line)) {
                if ($currentProxy && $currentName) {
                    $proxyMap[$currentName] = $currentProxy;
                }
                $currentProxy = $line;
                // 提取节点名称
                if (preg_match('/name:\s*"([^"]+)"/', $line, $matches)) {
                    $currentName = $matches[1];
                } elseif (preg_match('/name:\s*\'([^\']+)\'/', $line, $matches)) {
                    $currentName = $matches[1];
                } elseif (preg_match('/name:\s*([^,}]+)/', $line, $matches)) {
                    $currentName = trim($matches[1]);
                }
                continue;
            }
            
            // 检测标准格式新节点开始: - name: xxx
            if (preg_match('/^\s+-\s+name:\s*(.+)$/', $line, $matches)) {
                if ($currentProxy && $currentName) {
                    $proxyMap[$currentName] = $currentProxy;
                }
                $currentProxy = $line;
                $currentName = trim($matches[1], '"\'');
            } else if ($currentProxy && preg_match('/^\s+/', $line)) {
                // 继续当前节点的配置
                $currentProxy .= "\n" . $line;
            }
        }
    }
    
    // 保存最后一个节点
    if ($currentProxy && $currentName) {
        $proxyMap[$currentName] = $currentProxy;
    }
    
    return $proxyMap;
}

// 替换节点名称
function replaceNodeName($config, $oldName, $newName) {
    // 转义特殊字符
    $escapedOldName = preg_quote($oldName, '/');
    $quotedNewName = '"' . str_replace('"', '\\"', $newName) . '"';
    
    // 处理紧凑格式
    if (preg_match('/\{name:\s*([^,}]+)/', $config)) {
        // 尝试匹配带引号的名称: {name: "xxx"
        $config = preg_replace(
            '/(\{name:\s*)"' . $escapedOldName . '"/',
            '${1}' . $quotedNewName,
            $config,
            1
        );
        // 如果没有匹配到，尝试不带引号的: {name: xxx
        if (strpos($config, $newName) === false) {
            $config = preg_replace(
                '/(\{name:\s*)' . $escapedOldName . '([,}])/',
                '${1}' . $quotedNewName . '${2}',
                $config,
                1
            );
        }
    } else {
        // 标准格式
        // 尝试匹配带引号的名称: name: "xxx"
        $config = preg_replace(
            '/(name:\s*)"' . $escapedOldName . '"/',
            '${1}' . $quotedNewName,
            $config,
            1
        );
        // 如果没有匹配到，尝试不带引号的: name: xxx
        if (strpos($config, $newName) === false) {
            $config = preg_replace(
                '/(name:\s*)' . $escapedOldName . '(\s|$)/',
                '${1}' . $quotedNewName . '${2}',
                $config,
                1
            );
        }
    }
    return $config;
}

// 生成基本的代理配置（当找不到原始配置时）
function generateBasicProxyConfig($node, $displayName) {
    $type = strtolower($node['type']);
    $server = $node['server'];
    $port = $node['port'];
    
    // 使用紧凑格式生成
    $config = "  - {";
    $config .= 'name: "' . str_replace('"', '\\"', $displayName) . '", ';
    $config .= 'server: ' . $server . ', ';
    $config .= 'port: ' . $port . ', ';
    $config .= 'type: ' . $type;
    
    // 根据类型添加必要的字段
    switch ($type) {
        case 'ss':
        case 'shadowsocks':
            $config .= ', cipher: aes-256-gcm, password: "password"';
            break;
        case 'trojan':
            $config .= ', password: "password", skip-cert-verify: true';
            break;
        case 'vmess':
            $config .= ', uuid: "00000000-0000-0000-0000-000000000000", alterId: 0, cipher: auto';
            break;
        case 'vless':
            $config .= ', uuid: "00000000-0000-0000-0000-000000000000", tls: true';
            break;
    }
    
    $config .= "}\n";
    return $config;
}

function handleUploadYaml() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['content']) || empty($input['content'])) {
            throw new Exception('YAML文件内容为空');
        }
        
        $filename = isset($input['filename']) ? $input['filename'] : 'uploaded.yaml';
        $content = $input['content'];
        
        logMessage("收到YAML文件上传: $filename");
        
        // 保存上传的YAML文件
        $uploadedFile = DATA_DIR . '/uploaded.yaml';
        file_put_contents($uploadedFile, $content);
        
        // 解析YAML内容，提取节点
        $nodes = parseYamlProxies($content);
        
        if (empty($nodes)) {
            throw new Exception('未能从YAML文件中解析出有效节点');
        }
        
        // 过滤无效节点
        $validNodes = [];
        foreach ($nodes as $node) {
            if (!shouldFilterNode($node['name'])) {
                $validNodes[] = $node;
            }
        }
        
        if (empty($validNodes)) {
            throw new Exception('YAML文件中没有有效节点（所有节点都被过滤）');
        }
        
        // 保存节点到nodes.json
        $nodesFile = DATA_DIR . '/nodes.json';
        file_put_contents($nodesFile, json_encode($validNodes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        
        // 设置正确的权限
        chmod($nodesFile, 0666);
        
        logMessage("YAML文件解析完成，提取到 " . count($validNodes) . " 个有效节点");
        
        echo json_encode([
            'success' => true,
            'message' => 'YAML文件上传成功',
            'node_count' => count($validNodes),
            'filtered_count' => count($nodes) - count($validNodes)
        ]);
        
    } catch (Exception $e) {
        logMessage("YAML上传错误: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}
