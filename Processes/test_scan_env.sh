#!/bin/bash
# 测试 scan.php 的执行环境

echo "=== 测试 scan.php 执行环境 ==="

cd /www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator

echo "当前目录: $(pwd)"
echo ""

echo "测试 1: 直接运行 proxy_wrapper.py"
python3 proxy_wrapper.py --help 2>&1 | head -5
echo ""

echo "测试 2: 通过 PHP 运行"
php -r "
chdir('/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator');
putenv('PYTHONPATH=/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator');
\$cmd = 'python3 proxy_wrapper.py --help 2>&1';
exec(\$cmd, \$output, \$returnCode);
echo implode(\"\\n\", array_slice(\$output, 0, 5)) . \"\\n\";
echo \"返回码: \$returnCode\\n\";
"
