<?php
/**
 * 检测节点连通性和可用性
 * 优先使用 Clash 核心进行真实测试
 */

// 禁止显示 PHP 警告和错误
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['node'])) {
        throw new Exception('缺少节点信息');
    }

    $node = $data['node'];
    $server = $node['server'];
    $port = $node['port'];

    // 检查是否有 Clash 核心
    $clashAvailable = false;
    $clashBinary = null;
    
    // 检查常见的 Clash 二进制文件位置
    $possiblePaths = [
        '/usr/local/bin/clash',
        '/usr/bin/clash',
        '/opt/clash/clash',
        __DIR__ . '/../bin/clash'
    ];
    
    foreach ($possiblePaths as $path) {
        if (file_exists($path) && is_executable($path)) {
            $clashBinary = $path;
            $clashAvailable = true;
            break;
        }
    }

    if ($clashAvailable) {
        // 使用 Clash 核心进行真实测试
        $pythonScript = __DIR__ . '/../scripts/check_node_clash.py';
        $nodeJson = json_encode($node['raw'] ?? $node);
        
        $command = sprintf(
            'python3 %s %s %s 2>&1',
            escapeshellarg($pythonScript),
            escapeshellarg($nodeJson),
            escapeshellarg($clashBinary)
        );

        exec($command, $output, $returnCode);
        $result = implode("\n", $output);

        $checkResult = json_decode($result, true);

        if ($checkResult && isset($checkResult['available'])) {
            $responseData = [
                'success' => true,
                'available' => $checkResult['available'],
                'latency' => $checkResult['latency'] ?? '-',
                'details' => $checkResult['details'] ?? '',
                'method' => 'clash',
                'clash_path' => $clashBinary,
                'real_ip' => $checkResult['real_ip'] ?? null,
                'purity' => null
            ];
            
            // 如果节点可用且获取到了真实IP
            if ($checkResult['available'] && !empty($checkResult['real_ip'])) {
                // 检查节点是否已有IP纯净度数据
                $existingPurity = isset($node['purity']) && !empty($node['purity']) ? $node['purity'] : null;
                
                if ($existingPurity && isset($existingPurity['score'])) {
                    // 已有纯净度数据,直接使用
                    $responseData['purity'] = $existingPurity;
                } else {
                    // 没有纯净度数据,进行检测
                    $purityResult = checkIPPurityInternal($checkResult['real_ip']);
                    if ($purityResult) {
                        $responseData['purity'] = $purityResult;
                    }
                }
            }
            
            echo json_encode($responseData, JSON_UNESCAPED_UNICODE);
        } else {
            // Clash 检测失败，降级到简单测试
            throw new Exception('Clash检测失败: ' . $result);
        }
    } else {
        // 降级到简单的 TCP 连接测试
        $pythonScript = __DIR__ . '/../scripts/check_node.py';
        $command = sprintf(
            'python3 %s %s %s 2>&1',
            escapeshellarg($pythonScript),
            escapeshellarg($server),
            escapeshellarg($port)
        );

        exec($command, $output, $returnCode);
        $result = implode("\n", $output);

        $checkResult = json_decode($result, true);

        if ($checkResult && isset($checkResult['available'])) {
            echo json_encode([
                'success' => true,
                'available' => $checkResult['available'],
                'latency' => $checkResult['latency'] ?? '-',
                'purity' => $checkResult['purity'] ?? '-',
                'details' => ($checkResult['details'] ?? '') . ' (简单TCP测试)',
                'method' => 'tcp',
                'warning' => '未安装Clash核心，使用简单TCP测试，结果可能不准确'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception('检测脚本执行失败: ' . $result);
        }
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'available' => false
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * 内部调用IP纯净度检测
 */
function checkIPPurityInternal($ip) {
    // 验证IP格式
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return null;
    }
    
    $results = [];
    
    // 1. 检测IP类型
    $ipType = checkIPType($ip);
    $results['type'] = $ipType;
    
    // 2. 检测IP风险评分
    $riskScore = checkRiskScore($ip);
    $results['risk_score'] = $riskScore;
    
    // 3. 检测IP地理位置
    $location = checkLocation($ip);
    $results['location'] = $location;
    
    // 4. 计算综合纯净度评分
    $purityScore = calculatePurityScore($results);
    $results['score'] = $purityScore;
    $results['level'] = getPurityLevel($purityScore);
    
    return $results;
}

function checkIPType($ip) {
    $url = "https://ipapi.co/{$ip}/json/";
    
    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_USERAGENT, 'NodeLocalChecker/1.0');
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            
            if (isset($data['org'])) {
                $org = strtolower($data['org']);
                
                if (strpos($org, 'hosting') !== false || 
                    strpos($org, 'cloud') !== false || 
                    strpos($org, 'datacenter') !== false) {
                    return '数据中心';
                } elseif (strpos($org, 'mobile') !== false || 
                          strpos($org, 'wireless') !== false) {
                    return '移动网络';
                } else {
                    return '住宅IP';
                }
            }
        }
    } catch (Exception $e) {
        // 忽略错误
    }
    
    return '未知';
}

function checkRiskScore($ip) {
    $url = "http://ip-api.com/json/{$ip}?fields=status,message,proxy,hosting";
    
    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        if ($response) {
            $data = json_decode($response, true);
            
            if (isset($data['status']) && $data['status'] === 'success') {
                $score = 100;
                
                if (isset($data['proxy']) && $data['proxy']) {
                    $score -= 30;
                }
                
                if (isset($data['hosting']) && $data['hosting']) {
                    $score -= 20;
                }
                
                return max(0, $score);
            }
        }
    } catch (Exception $e) {
        // 忽略错误
    }
    
    return 50;
}

function checkLocation($ip) {
    $url = "http://ip-api.com/json/{$ip}?fields=country,countryCode,region,city,isp,org,as";
    
    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        if ($response) {
            $data = json_decode($response, true);
            
            if (isset($data['country'])) {
                return [
                    'country' => $data['country'] ?? '未知',
                    'country_code' => $data['countryCode'] ?? '',
                    'city' => $data['city'] ?? '',
                    'isp' => $data['isp'] ?? '未知'
                ];
            }
        }
    } catch (Exception $e) {
        // 忽略错误
    }
    
    return [
        'country' => '未知',
        'isp' => '未知'
    ];
}

function calculatePurityScore($results) {
    $score = 100;
    
    if ($results['type'] === '数据中心') {
        $score -= 20;
    } elseif ($results['type'] === '住宅IP') {
        $score += 10;
    } elseif ($results['type'] === '移动网络') {
        $score += 5;
    }
    
    $score = ($score + $results['risk_score']) / 2;
    
    return max(0, min(100, round($score)));
}

function getPurityLevel($score) {
    if ($score >= 90) {
        return '优秀';
    } elseif ($score >= 75) {
        return '良好';
    } elseif ($score >= 60) {
        return '一般';
    } elseif ($score >= 40) {
        return '较差';
    } else {
        return '很差';
    }
}
