<?php
// 测试YAML解析功能

// 包含必要的函数
define('DATA_DIR', dirname(__DIR__) . '/Projects/Aggregator/data');

function shouldFilterNode($name) {
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

function parseInlineProxy($proxyStr) {
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

// 测试
$yamlFile = dirname(__DIR__) . '/Projects/Aggregator/Aggregator_mac_App/html/clash_us.yaml';

if (!file_exists($yamlFile)) {
    die("文件不存在: $yamlFile\n");
}

echo "读取文件: $yamlFile\n";
$content = file_get_contents($yamlFile);

echo "开始解析...\n";
$nodes = parseYamlProxies($content);

echo "解析完成！\n";
echo "总节点数: " . count($nodes) . "\n\n";

// 显示前5个节点
echo "前5个节点:\n";
foreach (array_slice($nodes, 0, 5) as $i => $node) {
    echo ($i + 1) . ". {$node['name']}\n";
    echo "   类型: {$node['type']}\n";
    echo "   服务器: {$node['server']}\n";
    echo "   端口: {$node['port']}\n";
    echo "   位置: {$node['location']}\n\n";
}

// 保存到文件
$outputFile = DATA_DIR . '/test_nodes.json';
file_put_contents($outputFile, json_encode($nodes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo "节点已保存到: $outputFile\n";
