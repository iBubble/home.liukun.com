#!/bin/bash
cd '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator'
export PYTHONPATH='/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/external/aggregator'
python3 subscribe/collect.py --skip --overwrite --pages 2 --num 32 --targets clash > '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/scan_output.log' 2>&1
rm -f '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data/scan_task.pid'
