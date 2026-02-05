<?php
/**
 * 导出选中的节点为 Clash YAML 配置
 */

// 禁用错误输出,避免破坏输出格式
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/x-yaml');
header('Content-Disposition: attachment; filename="config_clash_' . date('Y-m-d') . '.yaml"');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['nodes']) || !is_array($data['nodes'])) {
        throw new Exception('缺少节点数据');
    }

    $nodes = $data['nodes'];
    
    // 构建 Clash 配置
    $config = [
        'port' => 7890,
        'socks-port' => 7891,
        'redir-port' => 7892,
        'allow-lan' => true,
        'mode' => 'rule',
        'log-level' => 'silent',
        'external-controller' => '0.0.0.0:9090',
        'secret' => '',
        'proxies' => []
    ];

    // 添加节点，并确保名称唯一
    $usedNames = [];
    foreach ($nodes as $node) {
        if (isset($node['raw'])) {
            $rawNode = $node['raw'];
            $originalName = $rawNode['name'];
            
            // 确保节点名称唯一
            $uniqueName = $originalName;
            $counter = 1;
            while (in_array($uniqueName, $usedNames)) {
                $uniqueName = $originalName . '_' . $counter;
                $counter++;
            }
            
            $rawNode['name'] = $uniqueName;
            $usedNames[] = $uniqueName;
            
            $config['proxies'][] = $rawNode;
        }
    }

    // 添加代理组（使用去重后的名称）
    $proxyNames = $usedNames;

    $config['proxy-groups'] = [
        [
            'name' => '🚀 节点选择',
            'type' => 'select',
            'proxies' => array_merge(['♻️ 自动选择', '🎯 全球直连'], $proxyNames)
        ],
        [
            'name' => '♻️ 自动选择',
            'type' => 'url-test',
            'proxies' => $proxyNames,
            'url' => 'http://www.gstatic.com/generate_204',
            'interval' => 300
        ],
        [
            'name' => '🎯 全球直连',
            'type' => 'select',
            'proxies' => ['DIRECT']
        ],
        [
            'name' => '🛑 全球拦截',
            'type' => 'select',
            'proxies' => ['REJECT', 'DIRECT']
        ]
    ];

    // 添加规则
    $config['rules'] = [
        'DOMAIN-SUFFIX,local,DIRECT',
        'IP-CIDR,127.0.0.0/8,DIRECT',
        'IP-CIDR,172.16.0.0/12,DIRECT',
        'IP-CIDR,192.168.0.0/16,DIRECT',
        'IP-CIDR,10.0.0.0/8,DIRECT',
        'IP-CIDR,17.0.0.0/8,DIRECT',
        'IP-CIDR,100.64.0.0/10,DIRECT',
        'GEOIP,CN,DIRECT',
        'MATCH,🚀 节点选择'
    ];

    // 生成 YAML
    $yaml = "# 节点本地检测工具导出配置\n";
    $yaml .= "# 导出时间: " . date('Y-m-d H:i:s') . "\n";
    $yaml .= "# 节点数量: " . count($nodes) . "\n";
    $yaml .= "#---------------------------------------------------#\n\n";
    $yaml .= Yaml::dump($config, 10, 2, Yaml::DUMP_MULTI_LINE_LITERAL_BLOCK);

    echo $yaml;

} catch (Exception $e) {
    http_response_code(400);
    echo "# 导出失败: " . $e->getMessage();
}
