import React from 'react';
import { Activity, Radio, Cpu, RefreshCw, Download, Terminal, Server, Package } from 'lucide-react';
import { ServerProfile } from '../types';

interface HeaderProps {
  activeTab: 'stream' | 'fleet' | 'simulator' | 'docs' | 'export';
  setActiveTab: (tab: 'stream' | 'fleet' | 'simulator' | 'docs' | 'export') => void;
  sseConnected: boolean;
  onOpenQuickSend: () => void;
  totalRecords: number;
  activeServer: ServerProfile | null;
  onOpenServerManager: () => void;
  onDownloadProjectZip: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  sseConnected,
  onOpenQuickSend,
  activeServer,
  onOpenServerManager,
  onDownloadProjectZip,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand wordmark & Active Server Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              TelemetryHub
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              REST Observability Server
            </span>
          </div>

          {/* Quick Server Switcher Tag */}
          <button
            onClick={onOpenServerManager}
            className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-white text-xs font-mono transition-colors"
            title="點擊切換或新增伺服器 URL"
          >
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span className="max-w-[120px] truncate font-medium">
              {activeServer?.name || '當前伺服器'}
            </span>
            <span className="text-[10px] text-slate-400">切換</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single-line, whitespace-nowrap) */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'stream'
                ? 'bg-slate-800 text-indigo-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-4 h-4" />
            即時數據記錄
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'fleet'
                ? 'bg-slate-800 text-indigo-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            裝置狀態清單
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'bg-slate-800 text-indigo-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            裝置端模擬除錯
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'docs'
                ? 'bg-slate-800 text-indigo-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" />
            REST API 與代碼
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'export'
                ? 'bg-slate-800 text-indigo-400 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Download className="w-4 h-4" />
            數據匯出
          </button>
        </nav>

        {/* Zone 3: Primary Action, Package Download & Live Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Download Project ZIP Button */}
          <button
            onClick={onDownloadProjectZip}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 transition-all shadow-sm whitespace-nowrap"
            title="下載本專案完整原始碼 ZIP 壓縮包 (Windows/Linux/macOS 皆可執行)"
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>打包下載專案</span>
          </button>

          <div className="hidden xl:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                sseConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'
              }`}
            />
            <span>{sseConnected ? 'SSE 即時連線' : '輪詢連線中'}</span>
          </div>

          <button
            onClick={onOpenQuickSend}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:scale-95 transition-all shadow-sm whitespace-nowrap"
          >
            發送測試數據
          </button>
        </div>
      </div>

      {/* Mobile nav drawer / tabs */}
      <div className="lg:hidden flex items-center justify-between border-t border-slate-800/80 px-2 py-2 overflow-x-auto text-xs gap-1">
        <button
          onClick={() => setActiveTab('stream')}
          className={`px-2 py-1 rounded whitespace-nowrap ${activeTab === 'stream' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300'}`}
        >
          即時數據
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-2 py-1 rounded whitespace-nowrap ${activeTab === 'fleet' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300'}`}
        >
          裝置列表
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-2 py-1 rounded whitespace-nowrap ${activeTab === 'simulator' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300'}`}
        >
          模擬除錯
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-2 py-1 rounded whitespace-nowrap ${activeTab === 'docs' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300'}`}
        >
          API代碼
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-2 py-1 rounded whitespace-nowrap ${activeTab === 'export' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300'}`}
        >
          數據匯出
        </button>
        <button
          onClick={onOpenServerManager}
          className="px-2 py-1 rounded bg-slate-800 text-indigo-300 whitespace-nowrap flex items-center gap-1"
        >
          <Server className="w-3 h-3" />
          伺服器
        </button>
        <button
          onClick={onDownloadProjectZip}
          className="px-2 py-1 rounded bg-emerald-600/30 text-emerald-300 whitespace-nowrap flex items-center gap-1"
        >
          <Package className="w-3 h-3" />
          下載ZIP
        </button>
      </div>
    </header>
  );
};
