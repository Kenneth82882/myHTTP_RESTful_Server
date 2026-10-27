import React, { useState } from 'react';
import { X, Copy, Check, Activity, Heart, Battery, Wifi, Clock, Globe } from 'lucide-react';
import { DeviceRecord } from '../types';

interface InspectModalProps {
  record: DeviceRecord | null;
  onClose: () => void;
  onSimulateDevice: (deviceId: string) => void;
}

export const InspectModal: React.FC<InspectModalProps> = ({
  record,
  onClose,
  onSimulateDevice,
}) => {
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHb = record.type === 'heartbeat';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            {isHb ? (
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <Heart className="w-4 h-4" />
              </span>
            ) : (
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Activity className="w-4 h-4" />
              </span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">{record.deviceId}</h3>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-indigo-400 uppercase">{record.type}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                封包序號: {record.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Hardware & Network Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                接收時間
              </div>
              <div className="text-slate-200 text-[11px] truncate" title={record.timestamp}>
                {new Date(record.timestamp).toLocaleTimeString()}
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                來源 IP
              </div>
              <div className="text-slate-200 text-[11px] truncate">
                {record.ip || '127.0.0.1'}
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
                <Battery className="w-3 h-3" />
                剩餘電量
              </div>
              <div className="text-slate-200 text-[11px]">
                {record.battery !== undefined ? `${record.battery}%` : '未提供'}
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                訊號強度
              </div>
              <div className="text-slate-200 text-[11px]">
                {record.rssi !== undefined ? `${record.rssi} dBm` : '未提供'}
              </div>
            </div>
          </div>

          {/* Message / Description */}
          {record.message && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-500 block mb-1">設備除錯附註 (message):</span>
              <p className="text-slate-200 font-sans text-xs">{record.message}</p>
            </div>
          )}

          {/* Parsed Metrics (if telemetry) */}
          {record.metrics && Object.keys(record.metrics).length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2 font-sans">
                傳感器解析指標 (Parsed Metrics):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(record.metrics).map(([key, val]) => (
                  <div key={key} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[10px] text-slate-400 truncate">{key}</div>
                    <div className="text-sm font-bold text-sky-400 mt-0.5 tabular-nums truncate">
                      {String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON Payload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 font-sans">
                完整原始 JSON 封包 (Raw Data):
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已複製' : '複製 JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-300 text-[11px] overflow-x-auto max-h-60">
              {JSON.stringify(record, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          <button
            onClick={() => {
              onSimulateDevice(record.deviceId);
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
          >
            在模擬器中除錯此裝置
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
