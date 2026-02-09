#!/bin/bash

# 服务管理脚本
# 用于快速管理所有关键服务

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo "=========================================="
    echo "服务管理脚本"
    echo "=========================================="
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "可用命令:"
    echo "  status    - 查看所有服务状态（默认）"
    echo "  start     - 启动所有服务"
    echo "  stop      - 停止所有服务"
    echo "  restart   - 重启所有服务"
    echo "  pm2       - 管理 PM2 进程"
    echo "  logs      - 查看服务日志"
    echo "  help      - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 status          # 查看服务状态"
    echo "  $0 restart         # 重启所有服务"
    echo "  $0 pm2 list        # 查看 PM2 进程列表"
    echo "  $0 logs aggregator # 查看 aggregator 日志"
    echo ""
}

# 检查服务状态
check_status() {
    bash "$SCRIPT_DIR/check_services.sh"
}

# 启动所有服务
start_all() {
    echo -e "${BLUE}正在启动所有服务...${NC}"
    echo ""
    
    # 启动系统服务
    echo -e "${YELLOW}1. 启动系统服务${NC}"
    sudo systemctl start nginx mysqld php-fpm-82 pm2-gemini
    echo -e "${GREEN}✅ 系统服务已启动${NC}"
    echo ""
    
    # 等待 PM2 启动
    sleep 2
    
    # 检查 PM2 进程
    echo -e "${YELLOW}2. 检查 PM2 进程${NC}"
    pm2 list
    echo ""
    
    echo -e "${GREEN}✅ 所有服务启动完成${NC}"
}

# 停止所有服务
stop_all() {
    echo -e "${BLUE}正在停止所有服务...${NC}"
    echo ""
    
    # 停止 PM2 进程
    echo -e "${YELLOW}1. 停止 PM2 进程${NC}"
    pm2 stop all
    echo -e "${GREEN}✅ PM2 进程已停止${NC}"
    echo ""
    
    # 停止系统服务（保留 nginx 和 mysql）
    echo -e "${YELLOW}2. 注意：不会停止 Nginx 和 MySQL${NC}"
    echo -e "${YELLOW}   如需停止，请手动执行：${NC}"
    echo -e "${YELLOW}   sudo systemctl stop nginx${NC}"
    echo -e "${YELLOW}   sudo systemctl stop mysqld${NC}"
    echo ""
    
    echo -e "${GREEN}✅ 服务停止完成${NC}"
}

# 重启所有服务
restart_all() {
    echo -e "${BLUE}正在重启所有服务...${NC}"
    echo ""
    
    # 重启 PM2 进程
    echo -e "${YELLOW}1. 重启 PM2 进程${NC}"
    pm2 restart all
    echo -e "${GREEN}✅ PM2 进程已重启${NC}"
    echo ""
    
    # 重启 PHP-FPM
    echo -e "${YELLOW}2. 重启 PHP-FPM${NC}"
    sudo systemctl restart php-fpm-82
    echo -e "${GREEN}✅ PHP-FPM 已重启${NC}"
    echo ""
    
    # 重载 Nginx
    echo -e "${YELLOW}3. 重载 Nginx 配置${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx 已重载${NC}"
    echo ""
    
    echo -e "${GREEN}✅ 所有服务重启完成${NC}"
}

# PM2 管理
manage_pm2() {
    if [ -z "$1" ]; then
        echo "PM2 管理命令："
        echo "  list      - 查看进程列表"
        echo "  logs      - 查看所有日志"
        echo "  restart   - 重启所有进程"
        echo "  save      - 保存进程列表"
        echo ""
        echo "示例: $0 pm2 list"
        return
    fi
    
    case "$1" in
        list)
            pm2 list
            ;;
        logs)
            pm2 logs
            ;;
        restart)
            pm2 restart all
            ;;
        save)
            pm2 save
            echo -e "${GREEN}✅ PM2 进程列表已保存${NC}"
            ;;
        *)
            pm2 "$@"
            ;;
    esac
}

# 查看日志
view_logs() {
    if [ -z "$1" ]; then
        echo "可用的日志："
        echo "  aggregator  - 机场聚合器"
        echo "  validator   - 节点验证服务"
        echo "  aimovie-api - AIMovie API"
        echo "  nginx       - Nginx 错误日志"
        echo "  php         - PHP-FPM 错误日志"
        echo ""
        echo "示例: $0 logs aggregator"
        return
    fi
    
    case "$1" in
        aggregator|validator|aimovie-api)
            pm2 logs "$1" --lines 100
            ;;
        nginx)
            sudo tail -f /var/log/nginx/error.log
            ;;
        php)
            sudo tail -f /var/log/php-fpm/error.log
            ;;
        *)
            echo -e "${RED}未知的日志类型: $1${NC}"
            ;;
    esac
}

# 主程序
main() {
    case "${1:-status}" in
        status)
            check_status
            ;;
        start)
            start_all
            ;;
        stop)
            stop_all
            ;;
        restart)
            restart_all
            ;;
        pm2)
            shift
            manage_pm2 "$@"
            ;;
        logs)
            shift
            view_logs "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
