<?php
/**
 * 服务器状态API
 * 使用PHP原生函数获取系统信息（不依赖shell_exec）
 */

// 禁用错误显示，只输出JSON
error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// 缓存时间（秒）- 减少系统调用频率
$cacheTime = 3;
$cacheFile = '/tmp/server_stats_cache.json';

// 检查缓存
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
    echo file_get_contents($cacheFile);
    exit;
}

$stats = [];

try {
    // 1. 系统基本信息
    $stats['system'] = [
        'hostname' => gethostname(),
        'os' => getOsInfo(),
        'kernel' => php_uname('r'),
        'arch' => php_uname('m'),
        'uptime' => getUptime(),
    ];

    // 2. CPU信息
    $stats['cpu'] = getCpuInfo();

    // 3. 内存信息
    $stats['memory'] = getMemoryInfo();

    // 4. 磁盘信息
    $stats['disk'] = getDiskInfo();

    // 5. 网络信息
    $stats['network'] = getNetworkInfo();

    // 6. 负载信息
    $loadavg = sys_getloadavg();
    $stats['load'] = [
        '1min' => round($loadavg[0], 2),
        '5min' => round($loadavg[1], 2),
        '15min' => round($loadavg[2], 2),
    ];

    // 7. 进程信息
    $stats['processes'] = getProcessInfo();

    // 8. 服务状态
    $stats['services'] = [
        'nginx' => checkService('nginx'),
        'mysql' => checkService('mysql'),
        'php-fpm' => checkService('php-fpm8.2') || checkService('php-fpm'),
        'docker' => checkService('docker'),
        'fail2ban' => checkService('fail2ban'),
    ];

    // 9. 连接数
    $stats['connections'] = getConnectionInfo();

    // 10. SSL证书信息
    $stats['ssl'] = getSslInfo();

    // 11. 时间戳
    $stats['timestamp'] = time();
    $stats['datetime'] = date('Y-m-d H:i:s');

    // 保存缓存
    file_put_contents($cacheFile, json_encode($stats));
    
    echo json_encode($stats);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * 获取操作系统信息
 */
function getOsInfo() {
    // 尝试读取os-release，但可能被open_basedir限制
    $osRelease = @file_get_contents('/etc/os-release');
    if ($osRelease && preg_match('/PRETTY_NAME="([^"]+)"/', $osRelease, $matches)) {
        return $matches[1];
    }
    
    // 备用方案：使用PHP函数
    return php_uname('s') . ' ' . php_uname('r');
}

/**
 * 获取运行时间
 */
function getUptime() {
    $uptime = 0;
    if (file_exists('/proc/uptime')) {
        $content = @file_get_contents('/proc/uptime');
        if ($content) {
            $uptime = floatval(explode(' ', $content)[0]);
        }
    }
    
    $days = intval(floor($uptime / 86400));
    $hours = intval(floor(($uptime % 86400) / 3600));
    $minutes = intval(floor(($uptime % 3600) / 60));
    
    return [
        'seconds' => intval($uptime),
        'days' => $days,
        'hours' => $hours,
        'minutes' => $minutes,
        'formatted' => sprintf('%d天 %d小时 %d分钟', $days, $hours, $minutes),
    ];
}

/**
 * 获取CPU信息
 */
function getCpuInfo() {
    // CPU型号
    $cpuModel = 'Unknown';
    if (file_exists('/proc/cpuinfo')) {
        $cpuinfo = file_get_contents('/proc/cpuinfo');
        if (preg_match('/model name\s*:\s*(.+)/i', $cpuinfo, $matches)) {
            $cpuModel = trim($matches[1]);
        }
    }
    
    // CPU核心数
    $cpuCores = 1;
    if (file_exists('/proc/cpuinfo')) {
        $cpuCores = substr_count(file_get_contents('/proc/cpuinfo'), 'processor');
    }
    
    // CPU使用率
    $cpuUsage = getCpuUsageFromProc();
    
    return [
        'model' => $cpuModel,
        'cores' => $cpuCores,
        'usage' => round((float)$cpuUsage, 2),
    ];
}

/**
 * 从/proc/stat计算CPU使用率
 */
function getCpuUsageFromProc() {
    $statFile = '/tmp/cpu_stat_last.json';
    
    $stat = @file_get_contents('/proc/stat');
    if (!$stat) return 0;
    
    preg_match('/^cpu\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/m', $stat, $matches);
    
    if (!$matches) return 0;
    
    $currentStat = [
        'user' => (int)$matches[1],
        'nice' => (int)$matches[2],
        'system' => (int)$matches[3],
        'idle' => (int)$matches[4],
        'iowait' => (int)$matches[5],
        'irq' => (int)$matches[6],
        'softirq' => (int)$matches[7],
        'time' => microtime(true),
    ];
    
    // 读取上次的数据
    $lastStat = null;
    if (file_exists($statFile)) {
        $lastData = @file_get_contents($statFile);
        if ($lastData) {
            $lastStat = json_decode($lastData, true);
        }
    }
    
    // 保存当前数据供下次使用
    file_put_contents($statFile, json_encode($currentStat));
    
    if ($lastStat === null) {
        return 0;
    }
    
    // 如果时间间隔太短，返回0
    $timeDiff = $currentStat['time'] - $lastStat['time'];
    if ($timeDiff < 0.5) {
        return 0;
    }
    
    $totalDiff = array_sum(array_slice($currentStat, 0, 7)) - array_sum(array_slice($lastStat, 0, 7));
    $idleDiff = $currentStat['idle'] - $lastStat['idle'];
    
    if ($totalDiff == 0) return 0;
    
    return round((1 - $idleDiff / $totalDiff) * 100, 2);
}

/**
 * 获取内存信息
 */
function getMemoryInfo() {
    $meminfo = file_get_contents('/proc/meminfo');
    
    preg_match('/MemTotal:\s+(\d+)/', $meminfo, $total);
    preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $available);
    preg_match('/MemFree:\s+(\d+)/', $meminfo, $free);
    preg_match('/Buffers:\s+(\d+)/', $meminfo, $buffers);
    preg_match('/Cached:\s+(\d+)/', $meminfo, $cached);
    preg_match('/SwapTotal:\s+(\d+)/', $meminfo, $swapTotal);
    preg_match('/SwapFree:\s+(\d+)/', $meminfo, $swapFree);
    
    $totalMem = $total[1];
    $availableMem = $available[1];
    $usedMem = $totalMem - $availableMem;
    
    $swapTotalMem = $swapTotal[1];
    $swapUsedMem = $swapTotalMem - $swapFree[1];
    
    return [
        'total' => round($totalMem / 1024 / 1024, 2), // GB
        'used' => round($usedMem / 1024 / 1024, 2),
        'free' => round($availableMem / 1024 / 1024, 2),
        'usage' => round(($usedMem / $totalMem) * 100, 2),
        'swap_total' => round($swapTotalMem / 1024 / 1024, 2),
        'swap_used' => round($swapUsedMem / 1024 / 1024, 2),
        'swap_usage' => $swapTotalMem > 0 ? round(($swapUsedMem / $swapTotalMem) * 100, 2) : 0,
    ];
}

/**
 * 获取磁盘信息
 */
function getDiskInfo() {
    // 使用当前目录而不是根目录，避免open_basedir限制
    $path = '/www/wwwroot/ibubble.vicp.net/';
    $total = @disk_total_space($path);
    $free = @disk_free_space($path);
    
    if ($total === false || $free === false) {
        return [
            'total' => 'N/A',
            'used' => 'N/A',
            'free' => 'N/A',
            'usage' => 0,
            'mount' => $path,
        ];
    }
    
    $used = $total - $free;
    $usage = ($total > 0) ? ($used / $total) * 100 : 0;
    
    return [
        'total' => formatBytes($total),
        'used' => formatBytes($used),
        'free' => formatBytes($free),
        'usage' => round($usage, 2),
        'mount' => $path,
    ];
}

/**
 * 格式化字节数
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}

/**
 * 获取网络信息
 */
function getNetworkInfo() {
    $statFile = '/tmp/network_stat_last.json';
    
    // 读取网络统计
    $netdev = @file_get_contents('/proc/net/dev');
    if (!$netdev) {
        return [
            'rx_total' => 0,
            'tx_total' => 0,
            'rx_rate' => 0,
            'tx_rate' => 0,
        ];
    }
    
    $lines = explode("\n", $netdev);
    
    $rx_bytes = 0;
    $tx_bytes = 0;
    
    foreach ($lines as $line) {
        if (strpos($line, ':') === false) continue;
        if (strpos($line, 'lo:') !== false) continue; // 跳过回环接口
        
        $parts = preg_split('/\s+/', trim($line));
        if (count($parts) < 10) continue;
        
        $rx_bytes += (int)$parts[1];
        $tx_bytes += (int)$parts[9];
    }
    
    $currentStat = [
        'rx' => $rx_bytes,
        'tx' => $tx_bytes,
        'time' => microtime(true),
    ];
    
    $result = [
        'rx_total' => round($rx_bytes / 1024 / 1024 / 1024, 2), // GB
        'tx_total' => round($tx_bytes / 1024 / 1024 / 1024, 2),
        'rx_rate' => 0,
        'tx_rate' => 0,
    ];
    
    // 读取上次的数据
    $lastStat = null;
    if (file_exists($statFile)) {
        $lastData = @file_get_contents($statFile);
        if ($lastData) {
            $lastStat = json_decode($lastData, true);
        }
    }
    
    // 保存当前数据供下次使用
    file_put_contents($statFile, json_encode($currentStat));
    
    // 计算速率（需要两次采样）
    if ($lastStat !== null) {
        $timeDiff = $currentStat['time'] - $lastStat['time'];
        if ($timeDiff > 0) {
            $result['rx_rate'] = round(($currentStat['rx'] - $lastStat['rx']) / $timeDiff / 1024, 2); // KB/s
            $result['tx_rate'] = round(($currentStat['tx'] - $lastStat['tx']) / $timeDiff / 1024, 2);
        }
    }
    
    return $result;
}

/**
 * 获取进程信息
 */
function getProcessInfo() {
    $total = 0;
    $running = 0;
    
    if (is_dir('/proc')) {
        $dirs = glob('/proc/[0-9]*', GLOB_ONLYDIR);
        $total = count($dirs);
        
        // 统计运行中的进程
        foreach ($dirs as $dir) {
            $statFile = $dir . '/stat';
            if (file_exists($statFile)) {
                $stat = @file_get_contents($statFile);
                if ($stat && preg_match('/\)\s+(\w)/', $stat, $matches)) {
                    if ($matches[1] === 'R') {
                        $running++;
                    }
                }
            }
        }
    }
    
    return [
        'total' => $total,
        'running' => $running,
    ];
}

/**
 * 获取连接信息
 */
function getConnectionInfo() {
    $established = 0;
    
    // 读取TCP连接信息
    if (file_exists('/proc/net/tcp')) {
        $tcp = @file_get_contents('/proc/net/tcp');
        if ($tcp) {
            $lines = explode("\n", $tcp);
            foreach ($lines as $line) {
                // 01 = ESTABLISHED状态
                if (strpos($line, ' 01 ') !== false) {
                    $established++;
                }
            }
        }
    }
    
    return [
        'total' => $established,
        'established' => $established,
    ];
}

/**
 * 检查服务状态
 */
function checkService($service) {
    // 检查进程是否存在
    if (is_dir('/proc')) {
        $dirs = glob('/proc/[0-9]*', GLOB_ONLYDIR);
        foreach ($dirs as $dir) {
            $cmdlineFile = $dir . '/cmdline';
            if (file_exists($cmdlineFile)) {
                $cmdline = @file_get_contents($cmdlineFile);
                if ($cmdline && stripos($cmdline, $service) !== false) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

/**
 * 获取SSL证书信息
 */
function getSslInfo() {
    // 使用openssl命令通过域名获取证书信息
    $domain = 'home.liukun.com';
    $port = 443;
    
    // 创建SSL上下文
    $context = stream_context_create([
        'ssl' => [
            'capture_peer_cert' => true,
            'verify_peer' => false,
            'verify_peer_name' => false,
        ]
    ]);
    
    // 尝试连接并获取证书
    $client = @stream_socket_client(
        "ssl://{$domain}:{$port}",
        $errno,
        $errstr,
        30,
        STREAM_CLIENT_CONNECT,
        $context
    );
    
    if (!$client) {
        return [
            'valid' => false,
            'days_remaining' => 0,
            'message' => 'Cannot connect to SSL server',
        ];
    }
    
    $params = stream_context_get_params($client);
    fclose($client);
    
    if (!isset($params['options']['ssl']['peer_certificate'])) {
        return [
            'valid' => false,
            'days_remaining' => 0,
            'message' => 'Cannot get certificate',
        ];
    }
    
    $certData = openssl_x509_parse($params['options']['ssl']['peer_certificate']);
    
    if (!$certData) {
        return [
            'valid' => false,
            'days_remaining' => 0,
            'message' => 'Cannot parse certificate',
        ];
    }
    
    $validTo = $certData['validTo_time_t'];
    $daysRemaining = floor(($validTo - time()) / 86400);
    
    return [
        'valid' => $daysRemaining > 0,
        'days_remaining' => $daysRemaining,
        'valid_from' => date('Y-m-d', $certData['validFrom_time_t']),
        'valid_to' => date('Y-m-d', $validTo),
        'issuer' => $certData['issuer']['O'] ?? 'Unknown',
    ];
}
