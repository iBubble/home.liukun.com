#!/usr/bin/env php
<?php
/**
 * 扫描监控脚本 - 实时同步节点数据
 * 在扫描过程中每隔几秒检查一次新节点并更新
 */

define('AGGREGATOR_DIR', __DIR__ . '/external/aggregator');
define('DATA_DIR', __DIR__ . '/data');
define('LOG_FILE', __DIR__ . '/logs/monitor.log');
define('PID_FILE', DATA_DIR . '/scan_task.pid');
define('PARSE_SCRIPT', __DIR__ . '/parse_nodes.py');

function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [Monitor] $message\n";
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
}

function getNodeCountFromYaml() {
    $yamlFile = AGGREGATOR_DIR . '/data/clash.yaml';
    if (!file_exists($yamlFile)) {
        return 0;
    }
    
    $content = file_get_contents($yamlFile);
    // 支持两种格式
    $count1 = preg_match_all('/^\s+- name:/m', $content);
    $count2 = preg_match_all('/^\s+- \{name:/m', $content);
    return max($count1, $count2);
}

function updateNodesData() {
    // 调用parse_nodes.py来更新数据
    $output = [];
    $returnCode = 0;
    exec('python3 ' . escapeshellarg(PARSE_SCRIPT) . ' 2>&1', $output, $returnCode);
    
    if ($returnCode === 0) {
        return true;
    }
    
    logMessage("解析节点失败: " . implode("\n", $output));
    return false;
}

function getNodeCountFromJson() {
    $nodesFile = DATA_DIR . '/nodes.json';
    if (!file_exists($nodesFile)) {
        return 0;
    }
    
    $nodes = json_decode(file_get_contents($nodesFile), true);
    return is_array($nodes) ? count($nodes) : 0;
}

// 主循环
logMessage("监控进程启动");

$lastYamlCount = 0;
$noUpdateCount = 0;
$maxNoUpdate = 10; // 连续10次没有新节点就退出

while (true) {
    // 检查扫描任务是否还在运行
    if (!file_exists(PID_FILE)) {
        logMessage("扫描任务已结束，执行最后一次更新");
        updateNodesData();
        $finalCount = getNodeCountFromJson();
        logMessage("监控进程退出，最终节点数: $finalCount");
        break;
    }
    
    $pid = trim(file_get_contents(PID_FILE));
    if (!file_exists("/proc/$pid")) {
        logMessage("扫描进程不存在，执行最后一次更新");
        updateNodesData();
        $finalCount = getNodeCountFromJson();
        logMessage("监控进程退出，最终节点数: $finalCount");
        break;
    }
    
    // 检查YAML文件中的节点数
    $currentYamlCount = getNodeCountFromYaml();
    
    // 如果YAML节点数有变化，更新JSON数据
    if ($currentYamlCount > $lastYamlCount) {
        if (updateNodesData()) {
            $jsonCount = getNodeCountFromJson();
            logMessage("发现新节点: YAML $lastYamlCount -> $currentYamlCount, JSON更新为 $jsonCount");
            $lastYamlCount = $currentYamlCount;
            $noUpdateCount = 0;
        }
    } else {
        $noUpdateCount++;
        if ($noUpdateCount >= $maxNoUpdate) {
            logMessage("连续 $maxNoUpdate 次没有新节点，监控进程退出");
            break;
        }
    }
    
    // 等待3秒后再次检查
    sleep(3);
}

$finalCount = getNodeCountFromJson();
logMessage("监控进程结束，最终节点数: $finalCount");
?>
