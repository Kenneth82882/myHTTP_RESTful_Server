import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Search, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Radio, 
  Activity, 
  Heart,
  Battery,
  Wifi,
  ChevronRight,
  Eraser,
  RotateCcw,
  Info
} from 'lucide-react';
import { DeviceRecord } from '../types';

interface LiveStreamProps {
  records: DeviceRecord[];
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  onInspect: (record: DeviceRecord) => void;
  onClear: () => void;
  onSeed: () => void;
  selectedDeviceFilter: string;
  setSelectedDeviceFilter: (deviceId: string) => void;
}

export const LiveStream: React.FC<LiveStreamProps> = ({
  records,
  isStreaming,
  setIsStreaming,
  onInspect,
  onClear,
  onSeed,
  selectedDeviceFilter,
  setSelectedDeviceFilter,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'telemetry' | 'heartbeat'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Client-side temporary view clear (does NOT delete any historical records from server)
  const [localClearedAt, setLocalClearedAt] = useState<number | null>(null);

  // Extract unique device IDs for filter dropdown
  const uniqueDevices = Array.from(new Set(records.map((r) => r.deviceId)));

  const filteredRecords = records.filter((r) => {
    // Hide records created before localClearedAt (temporary screen clear)
    if (localClearedAt !== null && new Date(r.timestamp).getTime() <= localClearedAt) {
      return false;
    }
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (selectedDeviceFilter && r.deviceId.toLowerCase() !== selectedDeviceFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDevice = r.deviceId.toLowerCase().includes(q);
      const matchMsg = (r.message || '').toLowerCase().includes(q);
      const matchIp = (r.ip || '').includes(q);
      const matchMetrics = r.metrics ? JSON.stringify(r.metrics).toLowerCase().includes(q) : false;
      return matchDevice || matchMsg || matchIp || matchMetrics;
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Control Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-2">
            <Radio className={`w-4 h-4 ${isStreaming ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-sm font-semibold text-white">實時數據串流記錄</span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ({filteredRecords.length} / 500 筆上限)
            </span>
          </div>

          {/* Type Segmented Button */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                typeFilter === 'all' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setTypeFilter('telemetry')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
                typeFilter === 'telemetry' ? 'bg-slate-800 text-sky-400 font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              遙測數據
            </button>
            <button
              onClick={() => setTypeFilter('heartbeat')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
                typeFilter === 'heartbeat' ? 'bg-slate-800 text-rose-400 font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className="w-3 h-3" />
              心跳訊號
            </button>
          </div>

          {/* Device Filter Dropdown */}
          {uniqueDevices.length > 0 && (
            <div className="relative">
              <select
                value={selectedDeviceFilter}
                onChange={(e) => setSelectedDeviceFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="">所有裝置篩選 ({uniqueDevices.length})</option>
                {uniqueDevices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right side tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="搜尋裝置、IP或數值..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsStreaming((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 px-2.5 ${
              isStreaming
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30'
            }`}
            title={isStreaming ? '暫停實時串流滾動' : '恢復實時串流'}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">暫停串流</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">恢復串流</span>
              </>
            )}
          </button>

          {/* TEMPORARY SCREEN CLEAR BUTTON (Does not touch server history!) */}
          <button
            onClick={() => setLocalClearedAt(Date.now())}
            className="p-1.5 rounded-lg border border-amber-500/50 bg-amber-950/40 hover:bg-amber-950/70 text-amber-300 text-xs transition-colors flex items-center gap-1.5 px-3 shadow-sm"
            title="暫時清除目前實時數據看板上的資訊（不會影響伺服器上的所有歷史記錄，隨時可按恢復）"
          >
            <Eraser className="w-3.5 h-3.5 text-amber-400" />
            <span className="whitespace-nowrap font-medium">暫清看板資訊 (保留歷史記錄)</span>
          </button>

          {/* Seed demo data */}
          <button
            onClick={onSeed}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs transition-colors flex items-center gap-1 px-2"
            title="注入測試物聯網模擬設備"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">範例</span>
          </button>

          {/* Clear server database logs */}
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-rose-400 hover:bg-slate-800 text-xs transition-colors"
            title="徹底清空伺服器儲存的資料庫記錄 (危險操作，此會清除伺服器歷史)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Temporary Screen Clear Notification Banner */}
      {localClearedAt !== null && (
        <div className="bg-amber-950/50 border-b border-amber-800/40 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              已暫時清除目前看板上的資訊。<strong>伺服器自啟動以來記錄的所有歷史數據均完整保留、絕不影響</strong>，後續接收到的新數據將繼續正常在此滾動。
            </span>
          </div>
          <button
            onClick={() => setLocalClearedAt(null)}
            className="px-3 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors whitespace-nowrap shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢復顯示看板歷史數據 ({records.length} 筆)</span>
          </button>
        </div>
      )}

      {/* High-Density Data Grid / Log Viewer */}
      <div className="overflow-x-auto min-h-[380px] max-h-[600px] overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Radio className="w-8 h-8 mb-2 text-slate-700 animate-pulse" />
            <p className="text-sm font-medium">
              {localClearedAt !== null ? '看板畫面已暫清，等待新數據流入中...' : '目前無數據記錄'}
            </p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm text-center">
              {localClearedAt !== null
                ? '點擊上方「恢復顯示全部歷史數據」可隨時恢復原先的記錄顯示'
                : '設備發送心跳 (Heartbeat) 或遙測 (Telemetry) 數據後，將即時毫秒級滾動於此'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 sticky top-0 z-10 font-sans text-[11px]">
                <th className="py-2.5 px-3">時間戳記</th>
                <th className="py-2.5 px-3">類型</th>
                <th className="py-2.5 px-3">裝置識別碼 (ID)</th>
                <th className="py-2.5 px-3">電量 / 訊號</th>
                <th className="py-2.5 px-3">運行時間</th>
                <th className="py-2.5 px-3">遙測指標 / 訊息</th>
                <th className="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRecords.map((r) => {
                const isHeartbeat = r.type === 'heartbeat';
                const hasMetrics = r.metrics && Object.keys(r.metrics).length > 0;

                return (
                  <tr
                    key={r.id}
                    onClick={() => onInspect(r)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(r.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isHeartbeat ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Heart className="w-2.5 h-2.5 fill-rose-400/30" />
                          HEARTBEAT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <Activity className="w-2.5 h-2.5" />
                          TELEMETRY
                        </span>
                      )}
                    </td>

                    {/* Device ID & Firmware */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {r.deviceId}
                        </span>
                        {r.firmwareVersion && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                            {r.firmwareVersion}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">{r.ip}</span>
                    </td>

                    {/* Battery & RSSI */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {r.battery !== undefined && (
                          <div className="flex items-center gap-1">
                            <Battery
                              className={`w-3.5 h-3.5 ${
                                r.battery > 50
                                  ? 'text-emerald-400'
                                  : r.battery > 20
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            />
                            <span className="text-slate-300">{r.battery}%</span>
                          </div>
                        )}
                        {r.rssi !== undefined && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Wifi className="w-3.5 h-3.5" />
                            <span>{r.rssi} dBm</span>
                          </div>
                        )}
                        {r.battery === undefined && r.rssi === undefined && (
                          <span className="text-slate-600">-</span>
                        )}
                      </div>
                    </td>

                    {/* Uptime */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {r.uptime !== undefined ? (
                        <span>
                          {r.uptime >= 86400
                            ? `${Math.floor(r.uptime / 86400)}d ${Math.floor((r.uptime % 86400) / 3600)}h`
                            : r.uptime >= 3600
                            ? `${Math.floor(r.uptime / 3600)}h ${Math.floor((r.uptime % 3600) / 60)}m`
                            : `${r.uptime}s`}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Metrics snapshot or message */}
                    <td className="py-2.5 px-3 max-w-xs truncate">
                      {hasMetrics ? (
                        <div className="flex items-center gap-1.5 flex-wrap truncate">
                          {Object.entries(r.metrics!).slice(0, 4).map(([key, val]) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300"
                            >
                              <span className="text-slate-400">{key}:</span>
                              <span className="font-bold text-indigo-300">
                                {typeof val === 'number' ? val : String(val)}
                              </span>
                            </span>
                          ))}
                          {Object.keys(r.metrics!).length > 4 && (
                            <span className="text-[10px] text-slate-500">
                              +{Object.keys(r.metrics!).length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 truncate block">
                          {r.message || '-'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspect(r);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors text-[11px]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>檢視</span>
                        <ChevronRight className="w-3 h-3 ml-0.5 opacity-60" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 text-slate-500 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>實時串流最大容量：500 筆 (先進先出 FIFO) · 歷史數據匯出無上限記錄</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          點選任一筆記錄展開 JSON 與指標分析
        </div>
      </div>
    </div>
  );
};
