#!/usr/bin/env php
<?php
echo "=== PHP 执行环境测试 ===\n\n";

echo "1. Python 路径:\n";
system('which python3');
echo "\n";

echo "2. Python 版本:\n";
system('python3 --version');
echo "\n";

echo "3. Python sys.path:\n";
system('python3 -c "import sys; print(\'\n\'.join(sys.path))"');
echo "\n";

echo "4. 测试导入 socks:\n";
system('python3 -c "import socks; print(\'PySocks version:\', socks.__version__)"');
echo "\n";

echo "5. 测试导入 socks (完整错误):\n";
system('python3 -c "import socks" 2>&1');
echo "\n";

echo "6. 环境变量:\n";
system('env | grep -E "(PATH|PYTHON|HOME)"');
echo "\n";

echo "7. 切换到 aggregator 目录后测试:\n";
chdir('/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator');
putenv('PYTHONPATH=/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator');
system('python3 -c "import socks; print(\'PySocks OK\')" 2>&1');
echo "\n";

echo "8. 运行 proxy_wrapper.py:\n";
system('python3 proxy_wrapper.py --help 2>&1 | head -3');
?>
