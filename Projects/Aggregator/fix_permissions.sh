#!/bin/bash
# 自动修复Aggregator权限问题

DATA_DIR="/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/data"

# 确保data目录可写
chmod 777 "$DATA_DIR" 2>/dev/null

# 确保所有JSON和YAML文件可读写
chmod 666 "$DATA_DIR"/*.json 2>/dev/null
chmod 666 "$DATA_DIR"/*.yaml 2>/dev/null

exit 0
