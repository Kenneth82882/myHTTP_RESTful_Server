import React, { useState } from 'react';
import { Copy, Check, Globe, ShieldCheck, Layers, Server, Package, ArrowRightLeft, Star } from 'lucide-react';
import { ServerInfo, ServerProfile } from '../types';

interface ServerBannerProps {
  serverInfo: ServerInfo | null;
  publicUrl: string;
  activeServer: ServerProfile | null;
  onOpenServerManager: () => void;
  onDownloadProjectZip: () => void;
  onSetCurrentAsDefault: () => void;
}

export const ServerBanner: React.FC<ServerBannerProps> = ({
  serverInfo,
  publicUrl,
  activeServer,
  onOpenServerManager,
  onDownloadProjectZip,
  onSetCurrentAsDefault,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const hbEndpoint = `${publicUrl}/api/heartbeat`;
  const telEndpoint = `${publicUrl}/api/telemetry`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-1">
            <Globe className="w-3.5 h-3.5" />
            <span>目前連接伺服器：<strong className="text-white">{activeServer?.name || '雲端預設'}</strong></span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              REST API 正常運行中
            </span>
            {activeServer?.isDefault && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                預設位址
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg font-mono font-bold text-white tracking-tight break-all">
              {publicUrl}
            </span>
            <button
              onClick={() => copyToClipboard(publicUrl, 'base')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="複製伺服器公網網址"
            >
              {copiedKey === 'base' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'base' ? '已複製' : '複製網址'}</span>
            </button>

            {/* Set as Default Address Button */}
            {!activeServer?.isDefault && (
              <button
                onClick={onSetCurrentAsDefault}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 transition-colors"
                title="將目前的伺服器網址設為開機預設連線位址"
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>設為預設位址</span>
              </button>
            )}

            <button
              onClick={onOpenServerManager}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 transition-colors"
              title="新增或切換不同的伺服器位址"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>切換 / 新增伺服器</span>
            </button>
          </div>
        </div>

        {/* Right side: Project download and cross-platform badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Download project package */}
          <button
            onClick={onDownloadProjectZip}
            className="flex items-center gap-2 text-xs font-sans text-left bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 px-3.5 py-2 rounded-lg text-emerald-300 hover:text-emerald-200 transition-colors group"
            title="下載本專案源碼 ZIP 包 (包含 package.json、server.ts、前端、Dockerfile 與說明)"
          >
            <Package className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <div className="font-bold flex items-center gap-1">
                下載專案原始碼 (ZIP)
              </div>
              <div className="text-[10px] text-emerald-400/80">
                可離線或部署至其他伺服器
              </div>
            </div>
          </button>

          {/* Cross-platform badge */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-lg">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="text-slate-200 font-semibold">
                Windows · Linux · macOS
              </div>
              <div className="text-[10px] text-slate-400">
                Node.js Express REST Engine ({serverInfo?.platform || 'linux'} {serverInfo?.arch || 'x64'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick REST API Endpoints Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs font-mono">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 truncate">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
              POST
            </span>
            <span className="text-slate-300 truncate">/api/heartbeat</span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">(裝置心跳保活)</span>
          </div>
          <button
            onClick={() => copyToClipboard(hbEndpoint, 'hb')}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 shrink-0 transition-colors"
            title="複製 Heartbeat 完整網址"
          >
            {copiedKey === 'hb' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 truncate">
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-semibold text-[10px]">
              POST
            </span>
            <span className="text-slate-300 truncate">/api/telemetry</span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">(傳感器與數據遙測)</span>
          </div>
          <button
            onClick={() => copyToClipboard(telEndpoint, 'tel')}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 shrink-0 transition-colors"
            title="複製 Telemetry 完整網址"
          >
            {copiedKey === 'tel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
