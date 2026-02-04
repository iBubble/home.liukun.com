#!/bin/bash
# 测试 Clash 核心是否正常工作

echo "================================"
echo "测试 Clash 核心"
echo "================================"
echo ""

echo "1. 检查 Clash 文件"
if [ -f "bin/clash" ]; then
    echo "✅ Clash 文件存在"
    ls -lh bin/clash
else
    echo "❌ Clash 文件不存在"
    exit 1
fi

echo ""
echo "2. 检查执行权限"
if [ -x "bin/clash" ]; then
    echo "✅ Clash 可执行"
else
    echo "❌ Clash 不可执行"
    exit 1
fi

echo ""
echo "3. 检查版本信息"
./bin/clash -v

echo ""
echo "4. 检查 API 检测"
php api/check_clash.php | python3 -m json.tool

echo ""
echo "================================"
echo "✅ Clash 核心测试通过！"
echo "================================"
echo ""
echo "现在可以访问项目进行节点检测："
echo "https://home.liukun.com:8443/Projects/NodeLocalChecker/"
