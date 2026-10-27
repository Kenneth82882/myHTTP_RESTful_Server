#!/bin/bash
# ========================================================
#  IoT & Device Telemetry REST Observability Server
#  macOS / Linux Launcher
# ========================================================

# 切換至腳本所在之專案根目錄
cd "$(dirname "$0")"

echo "========================================================"
echo "  IoT & Device Telemetry REST Observability Server"
echo "========================================================"
echo "[工作目錄] $(pwd)"
echo ""

# 1. 檢查 Node.js，若未安裝則自動嘗試安裝
if ! command -v node &> /dev/null; then
    echo "========================================================"
    echo "[提示] 系統中未找到 Node.js，正在嘗試自動安裝..."
    echo "========================================================"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "正在透過 Homebrew 自動安裝 Node.js..."
            brew install node
        fi
    elif command -v apt-get &> /dev/null; then
        echo "正在透過 apt 自動安裝 Node.js..."
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif command -v yum &> /dev/null; then
        echo "正在透過 yum 自動安裝 Node.js..."
        sudo yum install -y nodejs npm
    fi

    if ! command -v node &> /dev/null; then
        echo "[錯誤] 自動安裝未完成，請前往官方網站手動下載：https://nodejs.org/"
        exit 1
    fi
fi

echo "[環境檢測] 成功偵測到 Node.js 環境: $(node -v)"
echo ""

# 2. 檢查 node_modules
if [ ! -d "node_modules" ]; then
    echo "[提示] 首次運行，正在安裝所需相依套件 (npm install)..."
    echo "請稍候 1-2 分鐘..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "[錯誤] 套件安裝失敗，請檢查網路連線。"
        exit 1
    fi
    echo "[成功] 套件安裝完成！"
    echo ""
fi

# 3. 檢查編譯檔案 server.js 與 dist
if [ ! -f "server.js" ]; then
    echo "[提示] 正在編譯伺服器與前端資源..."
    npm run build
fi

# 4. 啟動伺服器並自動開啟瀏覽器
export PORT="${PORT:-5050}"
echo "[啟動中] 正在啟動伺服器於 http://localhost:${PORT} ..."
(
  sleep 2
  if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:${PORT}"
  elif command -v open &> /dev/null; then
    open "http://localhost:${PORT}"
  fi
) &

if [ -f "server.js" ]; then
    node server.js
else
    npm start || npm run dev
fi
