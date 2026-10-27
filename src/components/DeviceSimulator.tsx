import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Send, 
  Heart, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Clock,
  Radio
} from 'lucide-react';
import { postHeartbeat, postTelemetry } from '../services/api';
import { DeviceRecord } from '../types';

interface DeviceSimulatorProps {
  initialDeviceId?: string;
  onPacketSent?: (record?: DeviceRecord) => void;
  publicUrl: string;
  onViewStream?: () => void;
}

const PRESETS = [
  {
    id: 'F85B1B72AC78',
    name: '用戶實體 ESP32 (F85B1B72AC78)',
    firmware: '0.1.5',
    battery: 100,
    rssi: -54,
    metrics: {
      battery_voltage_mv: 4188,
      battery_level: 100,
      is_charging: false,
      uptime_sec: 9,
      boot_count: 1970,
      sos_trigger_count_24h: 0,
      wifi_rssi: -54,
      last_reset_reason: 'deep_sleep_wake',
      timestamp_utc: '2026-10-20T02:59:14Z',
    },
    message: 'Reset: deep_sleep_wake (硬體上報格式)',
  },
  {
    id: 'ESP32-SensNode-01',
    name: 'ESP32 智慧溫濕度節點',
    firmware: 'v2.1.4',
    battery: 89,
    rssi: -58,
    metrics: {
      temp_c: 25.4,
      humidity_pct: 62.1,
      lux: 540,
      vbat_v: 3.91,
    },
    message: 'ESP32 DHT22 + BH1750 ambient reading',
  },
  {
    id: 'RPI4-Gateway-Main',
    name: 'Raspberry Pi 4 邊緣閘道器',
    firmware: 'v3.2.0-linux',
    battery: 100,
    rssi: -45,
    metrics: {
      cpu_usage_pct: 22.8,
      mem_used_mb: 640,
      disk_free_gb: 41.5,
      temperature_c: 48.2,
    },
    message: 'System nominal edge telemetry report',
  },
  {
    id: 'STM32-FlowMeter-B2',
    name: 'STM32 工業管道流量計',
    firmware: 'v1.0.8',
    battery: 76,
    rssi: -66,
    metrics: {
      flow_lpm: 14.8,
      total_liters: 1435.3,
      pressure_psi: 32.5,
    },
    message: 'Industrial flow rate pulse packet',
  },
];

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({
  initialDeviceId,
  onPacketSent,
  publicUrl,
  onViewStream,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [deviceId, setDeviceId] = useState(initialDeviceId || PRESETS[0].id);
  const [firmware, setFirmware] = useState(PRESETS[0].firmware);
  const [battery, setBattery] = useState(PRESETS[0].battery);
  const [rssi, setRssi] = useState(PRESETS[0].rssi);
  const [status, setStatus] = useState('online');
  const [metricsJson, setMetricsJson] = useState(JSON.stringify(PRESETS[0].metrics, null, 2));
  const [message, setMessage] = useState(PRESETS[0].message);

  // Response state
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [recentSent, setRecentSent] = useState<DeviceRecord[]>([]);

  // Auto-pulse state
  const [autoHeartbeat, setAutoHeartbeat] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  // Update form if initialDeviceId changes
  useEffect(() => {
    if (initialDeviceId) {
      setDeviceId(initialDeviceId);
    }
  }, [initialDeviceId]);

  // Load preset
  const handleSelectPreset = (index: number) => {
    setSelectedPreset(index);
    const p = PRESETS[index];
    setDeviceId(p.id);
    setFirmware(p.firmware);
    setBattery(p.battery);
    setRssi(p.rssi);
    setMetricsJson(JSON.stringify(p.metrics, null, 2));
    setMessage(p.message);
  };

  // Heartbeat trigger
  const handleSendHeartbeat = async () => {
    setLoading(true);
    setResponseError(null);
    const start = performance.now();
    try {
      const res = await postHeartbeat({
        deviceId: deviceId.trim(),
        status,
        firmwareVersion: firmware,
        battery: Number(battery),
        rssi: Number(rssi),
        uptime: Math.floor(Math.random() * 10000 + 500),
        message: message || 'Device periodic heartbeat',
      });
      setLatencyMs(Math.round(performance.now() - start));
      setLastResponse(res);

      const hbRecord: DeviceRecord = {
        id: res.id || `hb-${Date.now()}`,
        type: 'heartbeat',
        deviceId: deviceId.trim(),
        timestamp: res.timestamp || new Date().toISOString(),
        ip: '127.0.0.1 (模擬器)',
        status,
        firmwareVersion: firmware,
        battery: Number(battery),
        rssi: Number(rssi),
        uptime: Math.floor(Math.random() * 10000 + 500),
        message: message || 'Heartbeat ACK OK',
      };

      setRecentSent((prev) => [hbRecord, ...prev.slice(0, 4)]);
      if (onPacketSent) onPacketSent(hbRecord);
    } catch (err: any) {
      setResponseError(err.message || 'Heartbeat request failed');
    } finally {
      setLoading(false);
    }
  };

  // Telemetry trigger
  const handleSendTelemetry = async () => {
    setLoading(true);
    setResponseError(null);
    const start = performance.now();
    try {
      let parsedMetrics = {};
      try {
        parsedMetrics = JSON.parse(metricsJson);
      } catch (e) {
        throw new Error('Metrics 必須為有效的 JSON 格式');
      }

      // Add a slight random drift to simulate real physical readings
      const driftedMetrics: Record<string, any> = {};
      for (const [k, v] of Object.entries(parsedMetrics)) {
        if (typeof v === 'number') {
          const delta = (Math.random() - 0.5) * 0.4;
          driftedMetrics[k] = parseFloat((v + delta).toFixed(2));
        } else {
          driftedMetrics[k] = v;
        }
      }

      const res = await postTelemetry({
        deviceId: deviceId.trim(),
        metrics: driftedMetrics,
        tags: ['simulator', 'debug-test'],
        status,
        battery: Number(battery),
        rssi: Number(rssi),
        firmwareVersion: firmware,
        message,
      });

      setLatencyMs(Math.round(performance.now() - start));
      setLastResponse(res);
      setMetricsJson(JSON.stringify(driftedMetrics, null, 2));

      const telRecord: DeviceRecord = {
        id: res.id || `tel-${Date.now()}`,
        type: 'telemetry',
        deviceId: deviceId.trim(),
        timestamp: res.timestamp || new Date().toISOString(),
        ip: '127.0.0.1 (模擬器)',
        status,
        metrics: driftedMetrics,
        tags: ['simulator', 'debug-test'],
        message: message || 'Telemetry sample recorded',
        firmwareVersion: firmware,
        battery: Number(battery),
        rssi: Number(rssi),
        uptime: 3600,
      };

      setRecentSent((prev) => [telRecord, ...prev.slice(0, 4)]);
      if (onPacketSent) onPacketSent(telRecord);
    } catch (err: any) {
      setResponseError(err.message || 'Telemetry request failed');
    } finally {
      setLoading(false);
    }
  };

  // Auto-pulse background runner
  useEffect(() => {
    let timer: any = null;
    if (autoHeartbeat) {
      timer = setInterval(() => {
        postHeartbeat({
          deviceId: deviceId.trim(),
          status,
          firmwareVersion: firmware,
          battery: Math.max(10, Number(battery) - Math.floor(Math.random() * 2)),
          rssi: Number(rssi) + Math.floor((Math.random() - 0.5) * 4),
          uptime: 3600 + pulseCount * 5,
          message: `Auto-simulated pulse #${pulseCount + 1}`,
        })
          .then((res) => {
            setLastResponse(res);
            setPulseCount((c) => c + 1);

            const pulseRecord: DeviceRecord = {
              id: res.id || `hb-${Date.now()}`,
              type: 'heartbeat',
              deviceId: deviceId.trim(),
              timestamp: res.timestamp || new Date().toISOString(),
              ip: '127.0.0.1 (模擬器)',
              status,
              firmwareVersion: firmware,
              battery: Number(battery),
              rssi: Number(rssi),
              uptime: 3600 + pulseCount * 5,
              message: `Auto pulse #${pulseCount + 1}`,
            };
            setRecentSent((prev) => [pulseRecord, ...prev.slice(0, 4)]);
            if (onPacketSent) onPacketSent(pulseRecord);
          })
          .catch((err) => {
            console.error('Pulse failed:', err);
          });
      }, 4000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoHeartbeat, deviceId, status, firmware, battery, rssi, pulseCount, onPacketSent]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Device Configuration Form */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              裝置端 REST API 模擬除錯器
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              直接在瀏覽器模擬硬體終端上報 Heartbeat 與 Telemetry，即時驗證除錯記錄
            </p>
          </div>
        </div>

        {/* Presets Selection */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            選擇示範硬體裝置預設範本
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(idx)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedPreset === idx
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-xs font-bold truncate">{p.name}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate">{p.id}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              裝置識別碼 (deviceId)
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              韌體版本 (firmwareVersion)
            </label>
            <input
              type="text"
              value={firmware}
              onChange={(e) => setFirmware(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              剩餘電量 % (battery)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={battery}
              onChange={(e) => setBattery(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Wi-Fi 訊號強度 dBm (rssi)
            </label>
            <input
              type="number"
              min="-100"
              max="-20"
              value={rssi}
              onChange={(e) => setRssi(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Metrics JSON */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span>傳感器指標載荷 (Telemetry Metrics JSON)</span>
            <span className="text-[11px] text-slate-500 font-normal">支援任意鍵值對 (Float, Int, String)</span>
          </label>
          <textarea
            rows={5}
            value={metricsJson}
            onChange={(e) => setMetricsJson(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs rounded-lg p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Debug Message */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            附加除錯訊息 (message)
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例如：Sensor calibrated, reading baseline stable"
            className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-800">
          <button
            onClick={handleSendHeartbeat}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg active:scale-95 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>發送 Heartbeat (心跳保活)</span>
          </button>

          <button
            onClick={handleSendTelemetry}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg active:scale-95 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>發送 Telemetry (遙測數據)</span>
          </button>

          <button
            onClick={() => setAutoHeartbeat((prev) => !prev)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 whitespace-nowrap ${
              autoHeartbeat
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {autoHeartbeat ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoHeartbeat ? `持續心跳脈衝 (${pulseCount})` : '開啟自動心跳脈衝 (每4秒)'}</span>
          </button>
        </div>
      </div>

      {/* Right: Response Inspector & Live Sent Feed */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              REST API 即時回應 (Response)
            </h4>
            {latencyMs !== null && (
              <span className="text-xs font-mono text-emerald-400">
                延遲: {latencyMs} ms
              </span>
            )}
          </div>

          {/* Quick Success Alert with Jump Link */}
          {lastResponse && !responseError && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">封包已成功寫入資料庫！</span>
              </div>
              {onViewStream && (
                <button
                  onClick={onViewStream}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                >
                  <span>切換至即時串流查看</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {responseError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>錯誤：{responseError}</span>
            </div>
          )}

          {/* Response JSON */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 min-h-[140px] max-h-[220px] overflow-y-auto mb-4">
            {loading ? (
              <div className="flex items-center justify-center h-28 text-slate-500 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>傳輸中...</span>
              </div>
            ) : lastResponse ? (
              <pre className="whitespace-pre-wrap text-[11px] text-emerald-300">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-28 text-slate-500 text-center">
                <Send className="w-5 h-5 mb-1.5 text-slate-600" />
                <p>點擊左側「發送 Heartbeat」或「發送 Telemetry」</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  API 回應狀態與伺服器確認封包將顯示在此處
                </p>
              </div>
            )}
          </div>

          {/* In-Place Recent Sent Records (Live Feedback) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 font-mono">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                本地模擬發送即時記錄 (Recent Ingested)
              </span>
              <span className="text-[11px] text-slate-500">
                {recentSent.length} 筆已發送
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {recentSent.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-slate-600 text-center text-[11px]">
                  尚未發送任何數據封包
                </div>
              ) : (
                recentSent.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          rec.type === 'heartbeat'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-sky-500/20 text-sky-400'
                        }`}
                      >
                        {rec.type === 'heartbeat' ? 'HB' : 'TEL'}
                      </span>
                      <span className="font-bold text-white truncate max-w-[120px]">
                        {rec.deviceId}
                      </span>
                      <span className="text-slate-500 text-[10px] hidden sm:inline">
                        {rec.metrics ? Object.keys(rec.metrics).slice(0, 2).map((k) => `${k}:${rec.metrics![k]}`).join(', ') : rec.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] shrink-0">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span>目標網址:</span>
            <span className="font-mono text-indigo-300 truncate max-w-[220px]">
              {publicUrl}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>通訊協定:</span>
            <span className="font-mono text-slate-300">HTTP/1.1 RESTful JSON (含後端代理轉發)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
