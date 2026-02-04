#!/bin/bash
echo $$ > '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/scan_task.pid'
cd '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator'
php '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/scan.php' >> '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/logs/aggregator.log' 2>&1
rm -f '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/scan_task.pid'
