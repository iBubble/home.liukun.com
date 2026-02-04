<?php
// 简单的HTTP服务器模拟
header("Content-Type: text/yaml; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$clashFile = __DIR__ . "/clash.yaml";
if (file_exists($clashFile)) {
    echo file_get_contents($clashFile);
} else {
    echo "# 暂无配置文件";
}
?>