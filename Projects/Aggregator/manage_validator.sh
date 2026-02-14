#!/bin/bash
# 节点验证服务管理脚本

case "$1" in
    start)
        echo "启动节点验证服务..."
        pm2 start node_validator_service.js --name node-validator
        ;;
    stop)
        echo "停止节点验证服务..."
        pm2 stop node-validator
        ;;
    restart)
        echo "重启节点验证服务..."
        pm2 restart node-validator
        ;;
    status)
        echo "查看服务状态..."
        pm2 status node-validator
        ;;
    logs)
        echo "查看日志..."
        pm2 logs node-validator --lines 50
        ;;
    api-status)
        echo "查看API状态..."
        curl -s http://127.0.0.1:3002/status | python3 -m json.tool
        ;;
    api-nodes)
        echo "查看已验证节点..."
        curl -s http://127.0.0.1:3002/nodes/all | python3 -m json.tool | head -50
        ;;
    api-validate)
        echo "手动触发验证..."
        curl -s -X POST http://127.0.0.1:3002/validate | python3 -m json.tool
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs|api-status|api-nodes|api-validate}"
        echo ""
        echo "命令说明:"
        echo "  start        - 启动验证服务"
        echo "  stop         - 停止验证服务"
        echo "  restart      - 重启验证服务"
        echo "  status       - 查看PM2状态"
        echo "  logs         - 查看服务日志"
        echo "  api-status   - 查看验证状态"
        echo "  api-nodes    - 查看已验证节点"
        echo "  api-validate - 手动触发验证"
        exit 1
        ;;
esac
