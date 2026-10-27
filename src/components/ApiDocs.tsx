import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2, Server, Cpu } from 'lucide-react';

interface ApiDocsProps {
  publicUrl: string;
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ publicUrl }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'esp32' | 'nodejs'>('curl');

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const hbUrl = `${publicUrl}/api/heartbeat`;
  const telUrl = `${publicUrl}/api/telemetry`;

  const curlHeartbeat = `curl -X POST "${hbUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "ESP32-SensNode-01",
    "status": "online",
    "firmwareVersion": "v2.1.4",
    "battery": 92,
    "rssi": -62,
    "uptime": 3600,
    "message": "Routine alive heartbeat"
  }'`;

  const curlTelemetry = `curl -X POST "${telUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "ESP32-SensNode-01",
    "metrics": {
      "temperature_c": 26.3,
      "humidity_pct": 59.4,
      "lux": 480,
      "voltage_v": 3.88
    },
    "tags": ["ambient", "factory_zone_1"],
    "message": "Periodic telemetry log"
  }'`;

  const pythonSnippet = `import requests
import time

SERVER_URL = "${publicUrl}"

def send_heartbeat(device_id="RPI-Edge-01"):
    url = f"{SERVER_URL}/api/heartbeat"
    payload = {
        "deviceId": device_id,
        "status": "online",
        "firmwareVersion": "v1.2.0",
        "battery": 95,
        "rssi": -55,
        "message": "Heartbeat from Python client"
    }
    resp = requests.post(url, json=payload, timeout=5)
    print("Heartbeat Response:", resp.status_code, resp.json())

def send_telemetry(device_id="RPI-Edge-01"):
    url = f"{SERVER_URL}/api/telemetry"
    payload = {
        "deviceId": device_id,
        "metrics": {
            "cpu_usage": 15.2,
            "memory_mb": 512,
            "temperature_c": 42.8
        },
        "tags": ["linux", "edge_node"]
    }
    resp = requests.post(url, json=payload, timeout=5)
    print("Telemetry Response:", resp.status_code, resp.json())

if __name__ == "__main__":
    send_heartbeat()
    time.sleep(1)
    send_telemetry()`;

  const esp32Snippet = `// ESP32 Arduino C++ HTTP/HTTPS POST 範例
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
// 若為 HTTPS 請搭配 client.setInsecure()；若為本機區網請用 http://192.168.x.x:5050/api/telemetry
const char* serverUrl = "${telUrl}";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // 若為 HTTPS 伺服器，需忽略 SSL 憑證檢查以避免被 ESP32 拒絕
    if (String(serverUrl).startsWith("https://")) {
      WiFiClientSecure client;
      client.setInsecure(); // 關鍵：跳過憑證鏈檢查
      http.begin(client, serverUrl);
    } else {
      http.begin(serverUrl);
    }

    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\\"deviceId\\":\\"ESP32-SensNode-01\\",\\"metrics\\":{\\"temp_c\\":25.3,\\"humidity_pct\\":60.1}}";
    int httpResponseCode = http.POST(jsonPayload);

    Serial.print("HTTP Response Code: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Server Response: " + response);
    } else {
      Serial.print("Error code: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
  delay(10000); // 每 10 秒上報一次
}`;

  const nodeSnippet = `// Node.js (fetch API - Windows/Linux/macOS 相容)
const SERVER_URL = '${publicUrl}';

async function reportTelemetry() {
  const res = await fetch(\`\${SERVER_URL}/api/telemetry\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'Node-Client-01',
      metrics: { load: 1.25, memory_used_mb: 256 },
      tags: ['node', 'service-health']
    })
  });
  const data = await res.json();
  console.log('Telemetry ACK:', data);
}

reportTelemetry();`;

  return (
    <div className="space-y-6">
      {/* Endpoints Specifications Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          RESTful API 規範說明
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          端點支援標準 HTTPS REST 請求，設備端發送 JSON 載荷，自動記錄設備來源 IP 與處理延遲。
        </p>

        <div className="space-y-3 font-mono text-xs">
          {/* Heartbeat API */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                POST
              </span>
              <span className="text-white font-bold">/api/heartbeat</span>
              <span className="text-slate-400 font-sans text-xs ml-auto">
                設備心跳保活上報
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans mb-1">
              參數欄位：<code className="text-indigo-300">deviceId</code> (必填), <code className="text-indigo-300">status</code>, <code className="text-indigo-300">firmwareVersion</code>, <code className="text-indigo-300">battery</code>, <code className="text-indigo-300">rssi</code>, <code className="text-indigo-300">uptime</code>
            </div>
          </div>

          {/* Telemetry API */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold text-[11px]">
                POST
              </span>
              <span className="text-white font-bold">/api/telemetry</span>
              <span className="text-slate-400 font-sans text-xs ml-auto">
                傳感器指標與除錯日誌
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans mb-1">
              參數欄位：<code className="text-indigo-300">deviceId</code> (必填), <code className="text-indigo-300">metrics</code> (任意 key-value 數值對象), <code className="text-indigo-300">tags</code>, <code className="text-indigo-300">message</code>
            </div>
          </div>

          {/* Stream API */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[11px]">
                GET
              </span>
              <span className="text-white font-bold">/api/stream</span>
              <span className="text-slate-400 font-sans text-xs ml-auto">
                Server-Sent Events (SSE) 即時數據流
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              建立長連線，當任何終端有新心跳或遙測到達時，毫秒級推播至前端。
            </div>
          </div>

          {/* Export API */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-[11px]">
                GET
              </span>
              <span className="text-white font-bold">/api/export?format=json|csv</span>
              <span className="text-slate-400 font-sans text-xs ml-auto">
                全量數據匯出下載
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Code Snippets with Live URL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-white">設備端整合代碼 (嵌入目前伺服器公網網址)</h4>
          </div>

          {/* Language Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedLang('curl')}
              className={`px-3 py-1 rounded transition-colors ${
                selectedLang === 'curl' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setSelectedLang('python')}
              className={`px-3 py-1 rounded transition-colors ${
                selectedLang === 'python' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setSelectedLang('esp32')}
              className={`px-3 py-1 rounded transition-colors ${
                selectedLang === 'esp32' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              ESP32 C++
            </button>
            <button
              onClick={() => setSelectedLang('nodejs')}
              className={`px-3 py-1 rounded transition-colors ${
                selectedLang === 'nodejs' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Node.js
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs">
          {selectedLang === 'curl' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[11px] font-sans">1. 發送 Heartbeat 心跳請求:</span>
                  <button
                    onClick={() => copyCode(curlHeartbeat, 'curl-hb')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    {copiedKey === 'curl-hb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'curl-hb' ? '已複製' : '複製 cURL'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 overflow-x-auto">
                  {curlHeartbeat}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[11px] font-sans">2. 發送 Telemetry 遙測數據:</span>
                  <button
                    onClick={() => copyCode(curlTelemetry, 'curl-tel')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    {copiedKey === 'curl-tel' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'curl-tel' ? '已複製' : '複製 cURL'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-sky-400 overflow-x-auto">
                  {curlTelemetry}
                </pre>
              </div>
            </div>
          )}

          {selectedLang === 'python' && (
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-sans">Python 3 設備客戶端 (樹莓派 / PC / 網關):</span>
                <button
                  onClick={() => copyCode(pythonSnippet, 'py')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  {copiedKey === 'py' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'py' ? '已複製' : '複製代碼'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-indigo-300 overflow-x-auto">
                {pythonSnippet}
              </pre>
            </div>
          )}

          {selectedLang === 'esp32' && (
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-sans">Arduino IDE / PlatformIO ESP32 傳感器程式碼:</span>
                <button
                  onClick={() => copyCode(esp32Snippet, 'esp32')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  {copiedKey === 'esp32' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'esp32' ? '已複製' : '複製代碼'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-amber-300 overflow-x-auto">
                {esp32Snippet}
              </pre>
            </div>
          )}

          {selectedLang === 'nodejs' && (
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-sans">Node.js 跨平台客戶端腳本:</span>
                <button
                  onClick={() => copyCode(nodeSnippet, 'node')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  {copiedKey === 'node' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'node' ? '已複製' : '複製代碼'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-emerald-300 overflow-x-auto">
                {nodeSnippet}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Cross-Platform Execution Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          跨平台 (Windows / Linux / macOS) 部署與執行方式
        </h4>
        <p className="text-xs text-slate-400 mb-3">
          本伺服器使用原生 Node.js 與 Express 框架構建，無任何作業系統專有二進制相依，可在任一平台上無縫執行：
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-slate-200 font-bold mb-1">Windows (cmd / PowerShell)</div>
            <pre className="text-slate-400 text-[11px]">
              {`npm install\nnpm run build\nnpm start`}
            </pre>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-slate-200 font-bold mb-1">Linux (Ubuntu / Debian / CentOS)</div>
            <pre className="text-slate-400 text-[11px]">
              {`npm install\nnpm run build\nPORT=5050 npm start`}
            </pre>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-slate-200 font-bold mb-1">macOS (Terminal / zsh)</div>
            <pre className="text-slate-400 text-[11px]">
              {`npm install\nnpm run build\nnpm start`}
            </pre>
          </div>
        </div>
      </div>

      {/* Troubleshooting Guide */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5">
        <h4 className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2">
          <span>⚠️ 為什麼我的裝置（ESP32 / 樹莓派 / 程式）沒有收到數據？（排查指南）</span>
        </h4>
        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="font-bold text-white mb-1">
              原因一：Google AI Studio 預覽環境的 Google Cookie 驗證攔截 (HTTP 302)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Google AI Studio 的線上預覽網址（例如 <code className="text-amber-400 font-mono">ais-dev-*.run.app</code>）在雲端前端代理層開啟了安全防護，<strong>要求存取者必須攜帶 Google 帳號瀏覽器 Cookie</strong>。當單晶片設備（如 ESP32、Arduino）或外部 Python 腳本向該網址發送 POST 請求時，Google 閘道會直接回傳 <code className="text-rose-400 font-mono">HTTP 302 Found</code>（重定向至 __cookie_check.html），請求尚未進入我們的 Node.js 伺服器即被 Google 阻擋。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                  解方 1 (最推薦 · 100% 直連)
                </span>
                <div className="font-bold text-white mt-1 mb-1">本機運行 (區網 IP 直連)</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  點擊右上角「打包下載專案」將 ZIP 解壓至電腦，雙擊 <code className="text-indigo-300 font-mono">start.bat</code>。裝置連至同一個 Wi-Fi，目標網址改為電腦區網 IP（如 <code className="text-indigo-300 font-mono">http://192.168.1.50:5050</code>），完全無任何 Google 驗證阻擋！
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 font-bold">
                  解方 2 (公網直通)
                </span>
                <div className="font-bold text-white mt-1 mb-1">使用 ngrok 免費穿透</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  本機啟動伺服器後，執行 <code className="text-indigo-300 font-mono">npx ngrok http 5050</code>，立即取得一個完全無驗證的公網 HTTPS 網址（如 <code className="text-indigo-300 font-mono">https://xxx.ngrok-free.app</code>），在頁面頂端切換伺服器即可遠端連線！
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 font-bold">
                  解方 3 (硬體常見踩坑)
                </span>
                <div className="font-bold text-white mt-1 mb-1">ESP32 忽略 SSL 憑證</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  ESP32 使用 HTTPS 時，若未呼叫 <code className="text-amber-300 font-mono">client.setInsecure()</code>，會因為缺乏根證書而主動中斷連線。請確認加上該指令，並確認標頭含有 <code className="text-amber-300 font-mono">Content-Type: application/json</code>。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 24/7 Long-Term Public Observation & Data Logging Guide */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
            🌐
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              24/7 長時間公網觀測與數據永續記錄指南 (Long-Term 24/7 Public Deployment)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              擺脫電腦待機中斷與 Google 登入驗證，獲得全球可直連的專屬公網網址與永久硬碟儲存
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          {/* Solution A: Cloudflare Tunnel */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  極力推薦 · 最靈活
                </span>
                <span className="text-slate-500 text-[10px]">100% 免費</span>
              </div>
              <h5 className="font-bold text-white text-sm mb-1.5">Cloudflare Tunnel (自架 24/7)</h5>
              <p className="text-slate-400 leading-relaxed mb-3">
                利用家中或辦公室的舊電腦、迷你主機（NUC）或樹莓派開著，執行 Cloudflare Tunnel，即可獲得<strong>永久固定的自訂網址</strong>（如 <code className="text-amber-300 font-mono">https://iot.yourdomain.com</code>）。
              </p>
              <ul className="text-slate-300 space-y-1.5 list-disc list-inside text-[11px] mb-3">
                <li>單晶片全球隨時直連，零驗證阻擋</li>
                <li>數據 100% 寫入您自己的硬碟，儲存容量無限</li>
                <li>無須設定路由器連接埠轉發（Port Forwarding）</li>
              </ul>
            </div>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[10px] text-slate-300 border border-slate-800">
              # 安裝 cloudflared 穿透至 5050 埠<br />
              <span className="text-indigo-400">cloudflared tunnel --url http://localhost:5050</span>
            </div>
          </div>

          {/* Solution B: Free Cloud Hosting (Render / Railway) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  完全免開電腦
                </span>
                <span className="text-slate-500 text-[10px]">一鍵部屬</span>
              </div>
              <h5 className="font-bold text-white text-sm mb-1.5">Render / Railway 雲端託管</h5>
              <p className="text-slate-400 leading-relaxed mb-3">
                本專案已內建 <code className="text-emerald-300 font-mono">Dockerfile</code> 與 <code className="text-emerald-300 font-mono">render.yaml</code>。只要將專案上傳至 GitHub，在 Render.com 一鍵連結，即可享有<strong>官方認證的永久 HTTPS 公網網址</strong>。
              </p>
              <ul className="text-slate-300 space-y-1.5 list-disc list-inside text-[11px] mb-3">
                <li>24 小時在線，自己電腦關機也能持續接收數據</li>
                <li>掛載 Persistent Disk 永久磁碟保留歷史</li>
                <li>手機、平板、辦公室隨時打開網頁即可監看</li>
              </ul>
            </div>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[10px] text-slate-300 border border-slate-800">
              目標端點：<br />
              <span className="text-emerald-400">https://your-app.onrender.com/api/telemetry</span>
            </div>
          </div>

          {/* Solution C: Permanent ngrok Static Domain */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  3 分鐘搞定
                </span>
                <span className="text-slate-500 text-[10px]">固定網址</span>
              </div>
              <h5 className="font-bold text-white text-sm mb-1.5">ngrok 免費固定靜態網域名稱</h5>
              <p className="text-slate-400 leading-relaxed mb-3">
                現在只要註冊一個免費 ngrok 帳號，官方即<strong>免費贈送一個永久不變的固定域名</strong>（如 <code className="text-sky-300 font-mono">my-telemetry.ngrok-free.app</code>），重開機或更換網路網址都不會改變！
              </p>
              <ul className="text-slate-300 space-y-1.5 list-disc list-inside text-[11px] mb-3">
                <li>重啟伺服器後網址永遠維持同一個</li>
                <li>單晶片韌體一次燒錄，永不需要再修改</li>
                <li>數據直接儲存於本機電腦 data/ 目錄</li>
              </ul>
            </div>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[10px] text-slate-300 border border-slate-800">
              # 綁定您的免費專屬固定網址<br />
              <span className="text-sky-400">npx ngrok http 5050 --domain=your-name.ngrok-free.app</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
