import React from 'react';
import { Cpu, Activity, Heart, Clock } from 'lucide-react';
import { ServerStats } from '../types';

interface StatsCardsProps {
  stats: ServerStats | null;
  uptimeSeconds: number;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, uptimeSeconds }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Active Devices */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">連線中裝置 (Active Fleet)</span>
          <Cpu className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {stats?.onlineDevices ?? 0}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            / {stats?.totalDevices ?? 0} 總註冊
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
          <span className="text-emerald-400 font-mono">{stats?.onlineDevices ?? 0} 在線</span>
          <span>·</span>
          <span className="text-amber-400 font-mono">{stats?.staleDevices ?? 0} 靜置</span>
          <span>·</span>
          <span className="text-slate-400 font-mono">{stats?.offlineDevices ?? 0} 離線</span>
        </div>
      </div>

      {/* 2. Heartbeat Counter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">心跳上報次數 (Heartbeats)</span>
          <Heart className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-rose-400">
            {stats?.heartbeatCount ?? 0}
          </span>
          <span className="text-xs text-slate-400 font-mono">次 Pings</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2">
          即時維持設備在線狀態與保活心跳
        </div>
      </div>

      {/* 3. Telemetry Packets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">遙測數據封包 (Telemetry)</span>
          <Activity className="w-4 h-4 text-sky-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-sky-400">
            {stats?.telemetryCount ?? 0}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            / {stats?.totalRecords ?? 0} 總記錄
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2">
          包含傳感器讀值、指標與除錯標籤
        </div>
      </div>

      {/* 4. Server Uptime & Engine */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">伺服器運行時長 (Uptime)</span>
          <Clock className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-indigo-300">
            {formatUptime(uptimeSeconds)}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2">
          Express 4.21 · Node.js 跨平台執行中
        </div>
      </div>
    </div>
  );
};
