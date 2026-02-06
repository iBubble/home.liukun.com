#!/bin/bash

echo "=== 测试update_check API ==="
echo ""

# 获取第一个节点的hash
NODE_HASH=$(php -r '
require_once "Projects/NodeLocalChecker/api/storage.php";
$storage = new NodeStorage();
$nodes = $storage->getAllNodes();
if (!empty($nodes)) {
    echo $nodes[0]["node_hash"];
}
')

echo "节点哈希: $NODE_HASH"
echo ""

# 测试API调用
echo "发送API请求..."
curl -X POST "https://home.liukun.com:8443/Projects/NodeLocalChecker/api/nodes.php?action=update_check" \
  -H "Content-Type: application/json" \
  -d "{
    \"node_hash\": \"$NODE_HASH\",
    \"result\": {
      \"available\": true,
      \"latency\": \"88.88\",
      \"real_ip\": \"8.8.8.8\",
      \"purity\": {
        \"score\": 88,
        \"level\": \"良好\",
        \"type\": \"数据中心IP\"
      }
    }
  }" \
  -k

echo ""
echo ""
echo "=== 验证保存结果 ==="
php -r '
require_once "Projects/NodeLocalChecker/api/storage.php";
$storage = new NodeStorage();
$nodes = $storage->getAllNodes();
$node = $nodes[0];
echo "节点名称: " . $node["name"] . "\n";
echo "可用性: " . ($node["available"] ?? "null") . "\n";
echo "延迟: " . ($node["latency"] ?? "null") . "\n";
echo "真实IP: " . ($node["real_ip"] ?? "null") . "\n";
echo "纯净度分数: " . ($node["ip_purity_score"] ?? "null") . "\n";
'
