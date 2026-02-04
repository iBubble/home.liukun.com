<?php
/**
 * 订阅链接动态端点
 * 实时读取subscription.yaml文件并返回，避免缓存问题
 */

// 设置响应头
header('Content-Type: text/yaml; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// 订阅文件路径
$subscriptionFile = __DIR__ . '/data/subscription.yaml';

// 检查文件是否存在
if (!file_exists($subscriptionFile)) {
    http_response_code(404);
    echo "# 错误: 订阅文件不存在\n";
    echo "# 请先生成订阅文件\n";
    exit;
}

// 读取并输出文件内容
$content = file_get_contents($subscriptionFile);

if ($content === false) {
    http_response_code(500);
    echo "# 错误: 无法读取订阅文件\n";
    exit;
}

// 输出YAML内容
echo $content;
