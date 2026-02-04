<?php
/**
 * IP纯净度检测 API
 * 通过第三方服务检测IP的质量和纯净度
 */

// 禁用错误输出,避免破坏JSON格式
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['ip'])) {
        throw new Exception('缺少IP地址');
    }

    $ip = $data['ip'];
    
    // 验证IP格式
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        throw new Exception('无效的IP地址');
    }

    $result = checkIPPurity($ip);
    
    echo json_encode([
        'success' => true,
        'ip' => $ip,
        'purity' => $result
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * 检测IP纯净度
 * 使用多个第三方API进行综合判断
 */
function checkIPPurity($ip) {
    $results = [];
    
    // 1. 检测IP类型（数据中心/住宅/移动）
    $ipType = checkIPType($ip);
    $results['type'] = $ipType;
    
    // 2. 检测是否在黑名单中
    $blacklist = checkBlacklist($ip);
    $results['blacklist'] = $blacklist;
    
    // 3. 检测IP风险评分
    $riskScore = checkRiskScore($ip);
    $results['risk_score'] = $riskScore;
    
    // 4. 检测IP地理位置
    $location = checkLocation($ip);
    $results['location'] = $location;
    
    // 5. 计算综合纯净度评分
    $purityScore = calculatePurityScore($results);
    $results['score'] = $purityScore;
    $results['level'] = getPurityLevel($purityScore);
    
    return $results;
}

/**
 * 检测IP类型
 */
function checkIPType($ip) {
    // 使用 ipapi.co 免费API
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
            
            // 判断IP类型
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

/**
 * 检测IP是否在黑名单中
 */
function checkBlacklist($ip) {
    // 使用 AbuseIPDB API（需要API密钥，这里使用简化版本）
    // 实际使用时需要注册获取API密钥
    
    // 简化版本：检查常见的黑名单特征
    $blacklistChecks = [
        'spam' => false,
        'proxy' => false,
        'vpn' => false,
        'tor' => false
    ];
    
    // 这里可以集成真实的黑名单API
    // 例如：AbuseIPDB, IPQualityScore, etc.
    
    return $blacklistChecks;
}

/**
 * 检测IP风险评分
 */
function checkRiskScore($ip) {
    // 使用 ip-api.com 免费API
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
                $score = 100; // 基础分100
                
                // 如果是代理，扣分
                if (isset($data['proxy']) && $data['proxy']) {
                    $score -= 30;
                }
                
                // 如果是托管服务器，扣分
                if (isset($data['hosting']) && $data['hosting']) {
                    $score -= 20;
                }
                
                return max(0, $score);
            }
        }
    } catch (Exception $e) {
        // 忽略错误
    }
    
    return 50; // 默认中等风险
}

/**
 * 检测IP地理位置
 */
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
                    'region' => $data['region'] ?? '',
                    'city' => $data['city'] ?? '',
                    'isp' => $data['isp'] ?? '未知',
                    'org' => $data['org'] ?? '未知',
                    'as' => $data['as'] ?? ''
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

/**
 * 计算综合纯净度评分
 */
function calculatePurityScore($results) {
    $score = 100;
    
    // 根据IP类型调整分数
    if ($results['type'] === '数据中心') {
        $score -= 20;
    } elseif ($results['type'] === '住宅IP') {
        $score += 10;
    } elseif ($results['type'] === '移动网络') {
        $score += 5;
    }
    
    // 根据黑名单情况调整分数
    if ($results['blacklist']['spam']) $score -= 30;
    if ($results['blacklist']['proxy']) $score -= 20;
    if ($results['blacklist']['vpn']) $score -= 15;
    if ($results['blacklist']['tor']) $score -= 25;
    
    // 结合风险评分
    $score = ($score + $results['risk_score']) / 2;
    
    return max(0, min(100, round($score)));
}

/**
 * 获取纯净度等级
 */
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
