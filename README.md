# IoT & Device Telemetry REST Observability Server

這是一個跨平台（Windows / Linux / macOS）的物聯網與終端設備除錯 RESTful 伺服器，基於 Node.js 與 Express 框架構建。提供即時數據記錄、設備心跳保活監測、Server-Sent Events (SSE) 毫秒級日誌串流、多伺服器切換連線、以及 CSV/JSON 數據匯出。

---

## ⚠️ 重要說明：為什麼直接雙擊 index.html 打不開？

本專案是一個 **完整的全端物聯網觀測伺服器**（包含 Node.js Express 後端 RESTful API 路由 `/api/telemetry`、`/api/heartbeat`、`/api/stream` 等，以及 React 即時視覺化前端）：
- **不能** 像純靜態網頁一樣直接雙擊 `index.html`（瀏覽器的 `file:///` 安全限制會封鎖模組載入且缺乏後端 API 伺服器）。
- **正確開啟方式**：只需執行專案內的啟動腳本，伺服器就會在背景運行並自動在瀏覽器開啟儀表板！

---

## ⚡ 1 秒一鍵快速啟動 (One-Click Start)

### 🪟 Windows 使用者：
1. 確保電腦已安裝 [Node.js](https://nodejs.org/)（建議下載 LTS 版本）。
2. 在解壓縮後的資料夾中，**直接滑鼠雙擊 `start.bat`**。
3. 腳本會自動檢查環境、安裝所需套件，並自動在瀏覽器中開啟 `http://localhost:3000`！

---

### 🍎 macOS / 🐧 Linux 使用者：
1. 開啟終端機 (Terminal) 並進入解壓縮目錄：
```bash
cd telemetry-rest-server
```
2. 執行啟動腳本：
```bash
./start.sh
```
（或直接在終端機輸入 `npm install && npm start`）
3. 瀏覽器將自動開啟 `http://localhost:3000`。

---

## 🛠️ 手動指令啟動方式 (Manual CLI)

如果你習慣使用終端機或命令提示字元 (cmd / PowerShell)：

```bash
# 1. 安裝相依套件 (首次執行只需一次)
npm install

# 2. 啟動伺服器
npm start
```
啟動成功後，即可在任何瀏覽器打開：
👉 **http://localhost:3000**

如需自訂通訊埠，可在環境變數指定：
```bash
PORT=8080 npm start
```

---

## 🐳 Docker 容器化部署 (選用)

若您有安裝 Docker，可完全免裝 Node.js 環境：
```bash
docker compose up -d --build
```
伺服器將在 `http://localhost:3000` 提供服務。

---

## 📡 RESTful API 規格速查

| 功能 | 方法 | 端點 | 說明 |
| :--- | :--- | :--- | :--- |
| **心跳保活** | `POST` | `/api/heartbeat` | 登記設備存活、電量、RSSI、運行時間 |
| **遙測數據** | `POST` | `/api/telemetry` | 接收感測器數值、環境指標、診斷日誌 |
| **即時串流** | `GET` | `/api/stream` | Server-Sent Events (SSE) 毫秒級即時推播 |
| **設備清單** | `GET` | `/api/devices` | 取得已連接設備健康狀態清單 |
| **全量匯出** | `GET` | `/api/export?format=csv` | 下載自開機以來全部歷史記錄 (CSV/JSON) |
| **專案下載** | `GET` | `/api/project/download-zip` | 下載最新伺服器原始碼套件包 |

---

## 💡 常見問題與除錯

1. **雙擊 `start.bat` 閃退？**
   - 請先確認電腦是否已安裝 Node.js：開啟 `cmd` 輸入 `node -v`，若顯示 `找不到指令`，請先至 [nodejs.org](https://nodejs.org/) 下載安裝並重啟終端。
2. **通訊埠 3000 已被佔用？**
   - 在 `.env` 或啟動時設定 `PORT=3001` 即可換埠。
