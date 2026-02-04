#!/bin/bash
echo "=================================================="
echo "   Antigravity Airport Aggregator Launcher"
echo "=================================================="

TARGET="external/aggregator/README.md"
echo "[*] 正在检查核心组件..."

# 检查后台 Git Clone 是否完成
# 简单判断方法：检查 README.md 是否存在
while [ ! -f "$TARGET" ]; do
  echo "[-] 核心组件正在下载中，请稍候..."
  sleep 5
done

echo "[+] 核心组件就绪！"
echo "[*] 启动主程序..."

# 自动安装依赖
pip3 install -r external/aggregator/requirements.txt
pip3 install pyyaml requests

python3 app.py
