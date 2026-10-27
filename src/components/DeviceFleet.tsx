import React from 'react';
import { Cpu, Wifi, Battery, Clock, ArrowUpRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DeviceSummary } from '../types';

interface DeviceFleetProps {
  devices: DeviceSummary[];
  onSelectDeviceFilter: (deviceId: string) => void;
  onSimulateForDevice: (deviceId: string) => void;
}

function formatRelativeTime(seconds?: number): string {
  if (seconds === undefined) return '未知';
  if (seconds < 5) return '剛剛';
  if (seconds < 60) return `${seconds} 秒前`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  return `${hours} 小時前`;
}

export const DeviceFleet: React.FC<DeviceFleetProps> = ({
  devices,
  onSelectDeviceFilter,
  onSimulateForDevice,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            註冊物聯網裝置清單 (Fleet Registry)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            依據 Heartbeat 與 Telemetry 自動彙整之在線終端狀態與硬體資訊
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400">
          共 {devices.length} 台裝置
        </span>
      </div>

      {devices.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <p className="text-sm">尚未有任何裝置向伺服器發送心跳或遙測數據</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-medium">裝置識別碼 (Device ID)</th>
                <th className="py-2.5 px-3 font-medium">通訊狀態</th>
                <th className="py-2.5 px-3 font-medium">韌體版本</th>
                <th className="py-2.5 px-3 font-medium">電量</th>
                <th className="py-2.5 px-3 font-medium">Wi-Fi 訊號</th>
                <th className="py-2.5 px-3 font-medium">最後通訊</th>
                <th className="py-2.5 px-3 font-medium">累計封包</th>
                <th className="py-2.5 px-3 font-medium">來源 IP</th>
                <th className="py-2.5 px-4 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {devices.map((dev) => {
                const isOnline = dev.status === 'online';
                const isStale = dev.status === 'stale';

                return (
                  <tr key={dev.deviceId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {dev.deviceId}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline
                              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                              : isStale
                              ? 'bg-amber-400'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span
                          className={`capitalize font-medium ${
                            isOnline
                              ? 'text-emerald-400'
                              : isStale
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {isOnline ? '正常在線' : isStale ? '訊號靜置' : '離線逾時'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {dev.firmwareVersion || 'v1.0.0'}
                    </td>

                    <td className="py-3 px-3 tabular-nums text-slate-300 whitespace-nowrap">
                      {dev.battery !== undefined ? (
                        <span className="flex items-center gap-1">
                          <Battery
                            className={`w-3.5 h-3.5 ${
                              dev.battery < 20
                                ? 'text-rose-400'
                                : dev.battery < 50
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          />
                          {dev.battery}%
                        </span>
                      ) : (
                        <span className="text-slate-600">外接電源</span>
                      )}
                    </td>

                    <td className="py-3 px-3 tabular-nums text-slate-300 whitespace-nowrap">
                      {dev.rssi !== undefined ? (
                        <span className="flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5 text-slate-400" />
                          {dev.rssi} dBm
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 tabular-nums text-slate-300 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatRelativeTime(dev.elapsedSeconds)}
                      </span>
                    </td>

                    <td className="py-3 px-3 tabular-nums text-indigo-400 font-semibold whitespace-nowrap">
                      {dev.totalPackets}
                    </td>

                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {dev.ip}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectDeviceFilter(dev.deviceId)}
                          className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          過濾記錄
                        </button>
                        <button
                          onClick={() => onSimulateForDevice(dev.deviceId)}
                          className="px-2 py-1 text-[11px] rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white transition-colors"
                        >
                          模擬除錯
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
