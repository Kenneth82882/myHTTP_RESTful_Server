import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Plus, 
  Trash2, 
  Check, 
  Wifi, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Globe,
  Star
} from 'lucide-react';
import { ServerProfile } from '../types';
import { pingServer } from '../services/api';

interface ServerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: ServerProfile[];
  activeServerId: string;
  onSelectServer: (server: ServerProfile) => void;
  onSetDefaultServer: (id: string) => void;
  onAddServer: (name: string, url: string) => Promise<boolean>;
  onDeleteServer: (id: string) => void;
  currentPublicUrl: string;
}

export const ServerManagerModal: React.FC<ServerManagerModalProps> = ({
  isOpen,
  onClose,
  servers,
  activeServerId,
  onSelectServer,
  onSetDefaultServer,
  onAddServer,
  onDeleteServer,
  currentPublicUrl,
}) => {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [testingUrl, setTestingUrl] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, { ok: boolean; latencyMs: number; error?: string }>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTestPing = async (url: string, id: string) => {
    setTestingUrl(id);
    const result = await pingServer(url);
    setPingResults((prev) => ({ ...prev, [id]: result }));
    setTestingUrl(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUrl = newUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      setFormError('請輸入有效的伺服器網址');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setFormError('伺服器網址必須以 http:// 或 https:// 開頭');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onAddServer(newName.trim() || cleanUrl, cleanUrl);
      if (success) {
        setNewName('');
        setNewUrl('');
      } else {
        setFormError('已存在相同網址的伺服器');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">切換與管理伺服器連線網址</h3>
              <p className="text-[11px] text-slate-400">
                可新增多組伺服器位址（雲端、區域網路或本機），隨時切換監測對象
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs font-sans">
          {/* Server List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-slate-300">已設定的伺服器列表 ({servers.length})</span>
              <span className="text-[11px] text-slate-500">點擊「切換連線」立即載入該伺服器數據</span>
            </div>

            <div className="space-y-2.5">
              {servers.map((srv) => {
                const isActive = srv.id === activeServerId;
                const ping = pingResults[srv.id];
                const isTesting = testingUrl === srv.id;

                return (
                  <div
                    key={srv.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-950/30 shadow-sm'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{srv.name}</span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              目前連線中
                            </span>
                          )}
                          {srv.isDefault && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                              系統預設
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-slate-400 text-[11px] flex items-center gap-1.5 break-all">
                          <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{srv.url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Ping button / status */}
                        <button
                          onClick={() => handleTestPing(srv.url, srv.id)}
                          disabled={isTesting}
                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
                          title="測試此網址是否可連線"
                        >
                          {isTesting ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                          ) : ping ? (
                            ping.ok ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-rose-400" />
                            )
                          ) : (
                            <Wifi className="w-3 h-3 text-slate-400" />
                          )}
                          <span>
                            {ping ? (ping.ok ? `${ping.latencyMs}ms` : '失敗') : '測速'}
                          </span>
                        </button>

                        {/* Set as Default button */}
                        <button
                          onClick={() => onSetDefaultServer(srv.id)}
                          className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                            srv.isDefault
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/30'
                          }`}
                          title={srv.isDefault ? '此網址為目前預設位址' : '將此網址設為系統啟動時的預設位址'}
                        >
                          <Star className={`w-3 h-3 ${srv.isDefault ? 'fill-amber-400 text-amber-400' : ''}`} />
                          <span className="hidden sm:inline">{srv.isDefault ? '預設位址' : '設為預設'}</span>
                        </button>

                        {/* Switch button */}
                        {!isActive ? (
                          <button
                            onClick={() => {
                              onSelectServer(srv);
                              onClose();
                            }}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors shadow-sm"
                          >
                            切換連線
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-mono px-2">
                            使用中
                          </span>
                        )}

                        {/* Delete button (non-default only) */}
                        {!srv.isDefault && (
                          <button
                            onClick={() => onDeleteServer(srv.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="刪除此伺服器記錄"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Server Form */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <h4 className="font-bold text-white text-xs mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" />
              新增自訂伺服器位址 (Add Server URL)
            </h4>

            {formError && (
              <div className="mb-3 p-2.5 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    伺服器名稱 / 標籤
                  </label>
                  <input
                    type="text"
                    placeholder="例如：廠房 A 邊緣網關、本機測試"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    伺服器 URL (含 http:// 或 https://)
                  </label>
                  <input
                    type="text"
                    placeholder="https://your-domain.run.app 或 http://localhost:5050"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-500">
                  可隨時在此切換伺服器，各伺服器網址將自動儲存於瀏覽器
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !newUrl.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增並加入清單</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
