#!/bin/bash
# 测试app.js使用validated_nodes.json访问Linux.do

echo "========================================="
echo "测试app.js使用validated_nodes.json"
echo "========================================="
echo ""

# 检查validated_nodes.json
if [ ! -f "Projects/Aggregator/validated_nodes.json" ]; then
    echo "❌ validated_nodes.json 不存在"
    exit 1
fi

echo "✅ validated_nodes.json 存在"
echo ""

# 显示excellent节点数量
EXCELLENT_COUNT=$(cat Projects/Aggregator/validated_nodes.json | grep -o '"excellent"' | wc -l)
echo "📊 excellent节点数量: $EXCELLENT_COUNT"
echo ""

# 启动app.js (后台)
echo "🚀 启动app.js..."
cd Projects/Aggregator
node app.js > /tmp/aggregator_test.log 2>&1 &
APP_PID=$!
echo "✅ app.js已启动 (PID: $APP_PID)"
echo ""

# 等待启动
echo "⏳ 等待5秒让服务启动..."
sleep 5

# 检查进程是否还在运行
if ! ps -p $APP_PID > /dev/null; then
    echo "❌ app.js启动失败"
    cat /tmp/aggregator_test.log
    exit 1
fi

echo "✅ app.js正在运行"
echo ""

# 测试API
echo "📡 测试API端点..."
echo ""

# 测试状态
echo "1. 测试 /api/status"
curl -s http://127.0.0.1:3001/api/status | python3 -m json.tool | head -20
echo ""

# 等待一下
sleep 2

# 停止app.js
echo ""
echo "🛑 停止app.js..."
kill $APP_PID 2>/dev/null
sleep 2

# 显示日志
echo ""
echo "========================================="
echo "app.js 日志 (最后30行)"
echo "========================================="
tail -30 /tmp/aggregator_test.log

echo ""
echo "✅ 测试完成"
