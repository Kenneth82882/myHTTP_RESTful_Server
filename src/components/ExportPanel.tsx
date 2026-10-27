import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Copy, Check, Package, Infinity as InfinityIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { getExportUrl, getDownloadProjectZipUrl, downloadProjectZipFile } from '../services/api';
import { DeviceRecord } from '../types';

interface ExportPanelProps {
  records: DeviceRecord[];
  uniqueDevices: string[];
  publicUrl: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ records, uniqueDevices, publicUrl }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sourceScope, setSourceScope] = useState<'all' | 'stream'>('all');
  const [copied, setCopied] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const filteredRecords = records.filter((r) => {
    if (selectedType !== 'all' && r.type !== selectedType) return false;
    if (selectedDevice && r.deviceId !== selectedDevice) return false;
    return true;
  });

  const downloadUrl = getExportUrl(format, selectedDevice || undefined, selectedType, sourceScope);
  const zipDownloadUrl = getDownloadProjectZipUrl();

  const handleDownload = () => {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    if (format === 'csv') {
      const headers = ['id', 'type', 'deviceId', 'timestamp', 'status', 'ip', 'battery', 'rssi', 'uptime', 'message', 'metrics'];
      const rows = filteredRecords.map((r) => {
        const metricsStr = r.metrics ? JSON.stringify(r.metrics).replace(/"/g, '""') : '';
        const messageClean = (r.message || '').replace(/"/g, '""');
        return [
          `"${r.id}"`,
          `"${r.type}"`,
          `"${r.deviceId}"`,
          `"${r.timestamp}"`,
          `"${r.status || ''}"`,
          `"${r.ip}"`,
          r.battery !== undefined ? r.battery : '',
          r.rssi !== undefined ? r.rssi : '',
          r.uptime !== undefined ? r.uptime : '',
          `"${messageClean}"`,
          `"${metricsStr}"`,
        ].join(',');
      });
      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n') + '\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `telemetry-export-${timestampStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(filteredRecords, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `telemetry-export-${timestampStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadProjectZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadProjectZipFile();
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleCopyPreview = () => {
    const text = format === 'json' 
      ? JSON.stringify(filteredRecords, null, 2)
      : filteredRecords.map(r => `${r.timestamp},${r.type},${r.deviceId},${r.status},${JSON.stringify(r.metrics || {})}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Complete Project Package Download Banner */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">完整專案原始碼打包下載 (.ZIP)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  即開即用 Turnkey
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                包含 Express 伺服器 (<code className="text-emerald-300 font-mono">server.ts</code>)、預編譯前端 (<code className="text-emerald-300 font-mono">dist/</code>)、原始碼與設定檔。<strong>解壓縮後 Windows 使用者請直接雙擊 <code className="text-amber-300 font-mono">start.bat</code></strong>（Mac/Linux 執行 <code className="text-amber-300 font-mono">./start.sh</code>），將自動在瀏覽器開啟 <code className="text-slate-200 font-mono">http://127.0.0.1:5050</code>（預設連接埠為 5050，避免與 3000 衝突，可在腳本自由修改；請勿直接用瀏覽器雙擊 index.html 本地檔案）。
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadProjectZip}
            disabled={isDownloadingZip}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {isDownloadingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在打包下載中...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>下載完整專案壓縮包 (ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Telemetry and Heartbeat Data Records Export */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-400" />
                歷史數據記錄檔匯出中心 (Export All Records)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <InfinityIcon className="w-3 h-3 text-indigo-400" />
                無上限筆數記錄
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              伺服器自運行啟動開始，已<strong>持續記錄所有實時數據且無上限筆數</strong>；實時看板維持最近 500 筆串流，歷史匯出則包含全部完整記錄！
            </p>
          </div>
        </div>

        {/* Filter and Config Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {/* Export Scope (All history vs Stream 500) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              匯出資料範圍
            </label>
            <select
              value={sourceScope}
              onChange={(e) => setSourceScope(e.target.value as 'all' | 'stream')}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">伺服器完整歷史數據 (無上限，推薦)</option>
              <option value="stream">當前實時串流數據 (最近 500 筆)</option>
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              檔案格式
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                  format === 'csv'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">CSV</div>
                  <div className="text-[10px] text-slate-400">Excel相容</div>
                </div>
              </button>

              <button
                onClick={() => setFormat('json')}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                  format === 'json'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileJson className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">JSON</div>
                  <div className="text-[10px] text-slate-400">樹狀結構</div>
                </div>
              </button>
            </div>
          </div>

          {/* Record Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              數據類型篩選
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">全部 (Telemetry + Heartbeat)</option>
              <option value="telemetry">僅 Telemetry (遙測指標)</option>
              <option value="heartbeat">僅 Heartbeat (心跳保活)</option>
            </select>
          </div>

          {/* Device Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              指定目標裝置
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="">所有裝置 (不限)</option>
              {uniqueDevices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Box & Actions */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-xs">
            <span className="text-slate-400">當前篩選預覽筆數：</span>
            <span className="font-mono font-bold text-white text-sm ml-1 tabular-nums">
              {filteredRecords.length}
            </span>
            <span className="text-slate-500 ml-1">
              （匯出時將從伺服器端無上限完整下載所有數據）
            </span>
            <div className="text-slate-500 text-[11px] mt-0.5">
              包含完整時間戳記、來源 IP、硬體指標與 JSON 載荷
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPreview}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製內容' : '複製預覽內容'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-lg shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>下載 {format.toUpperCase()} 完整記錄檔</span>
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-2 font-mono">
            即時資料預覽 (Preview - 前 5 筆)
          </h4>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono max-h-60 overflow-y-auto">
            {filteredRecords.length === 0 ? (
              <div className="text-slate-600 py-6 text-center">無符合條件的數據</div>
            ) : (
              <pre className="text-slate-300 whitespace-pre-wrap text-[11px]">
                {format === 'json'
                  ? JSON.stringify(filteredRecords.slice(0, 5), null, 2)
                  : [
                      'id,type,deviceId,timestamp,status,ip,battery,rssi,uptime,message,metrics',
                      ...filteredRecords
                        .slice(0, 5)
                        .map((r) =>
                          `"${r.id}","${r.type}","${r.deviceId}","${r.timestamp}","${r.status || ''}","${r.ip}",${r.battery || ''},${r.rssi || ''},${r.uptime || ''},"${r.message || ''}","${JSON.stringify(r.metrics || {}).replace(/"/g, '""')}"`
                        ),
                    ].join('\n')}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
