import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ServerBanner } from './components/ServerBanner';
import { StatsCards } from './components/StatsCards';
import { LiveStream } from './components/LiveStream';
import { DeviceFleet } from './components/DeviceFleet';
import { DeviceSimulator } from './components/DeviceSimulator';
import { ApiDocs } from './components/ApiDocs';
import { ExportPanel } from './components/ExportPanel';
import { InspectModal } from './components/InspectModal';
import { ServerManagerModal } from './components/ServerManagerModal';
import { 
  fetchServerInfo, 
  fetchLogs, 
  fetchDevices, 
  clearAllLogs, 
  seedSampleData, 
  setActiveBaseUrl,
  getDownloadProjectZipUrl,
  downloadProjectZipFile
} from './services/api';
import { DeviceRecord, DeviceSummary, ServerInfo, ServerStats, ServerProfile } from './types';

const STORAGE_SERVERS_KEY = 'telemetry_hub_servers';
const STORAGE_ACTIVE_ID_KEY = 'telemetry_hub_active_server_id';
const TARGET_DEFAULT_URL = 'https://ais-dev-p4jio37ptq2x3uos7mfzw5-970431913807.asia-east1.run.app';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stream' | 'fleet' | 'simulator' | 'docs' | 'export'>('stream');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [records, setRecords] = useState<DeviceRecord[]>([]);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  // Multi-server management state (defaults to ais-east1)
  const [servers, setServers] = useState<ServerProfile[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('ais-east1-default');
  const [isServerManagerOpen, setIsServerManagerOpen] = useState(false);

  // SSE & Live Stream State
  const [sseConnected, setSseConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [inspectedRecord, setInspectedRecord] = useState<DeviceRecord | null>(null);
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState('');
  const [simulatorDeviceId, setSimulatorDeviceId] = useState('');

  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  // Find active server profile
  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0] || null;

  // Determine effective public URL
  const publicUrl = activeServer?.url || serverInfo?.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  // Initialize server profiles from localStorage
  useEffect(() => {
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const localServerUrl = isLocalhost ? originUrl : 'http://localhost:5050';
    const fallbackHostingUrl = 'https://ais-dev-yacitw7nwo5ejrmluebr6q-434600176726.asia-northeast1.run.app';
    const effectiveHostingUrl = originUrl && !isLocalhost ? originUrl : fallbackHostingUrl;

    const initialPresets: ServerProfile[] = [
      {
        id: 'local-node',
        name: '本機 Node.js 伺服器 (Localhost:5050)',
        url: localServerUrl,
        isDefault: isLocalhost,
        addedAt: new Date().toISOString(),
      },
      {
        id: 'ais-east1-default',
        name: 'asia-east1 雲端伺服器 (指定預設位址)',
        url: TARGET_DEFAULT_URL,
        isDefault: !isLocalhost,
        addedAt: new Date().toISOString(),
      },
      {
        id: 'current-hosting-app',
        name: '目前主機環境 (Hosting Cloud)',
        url: effectiveHostingUrl,
        isDefault: false,
        addedAt: new Date().toISOString(),
      },
    ];

    try {
      const saved = localStorage.getItem(STORAGE_SERVERS_KEY);
      const savedActiveId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (saved) {
        let parsed: ServerProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If a saved active server exists, respect user selection
          const activeMatch = savedActiveId ? parsed.find((p) => p.id === savedActiveId) : null;
          const chosen = activeMatch || (isLocalhost ? parsed.find((p) => p.id === 'local-node') : parsed[0]) || parsed[0];

          setServers(parsed);
          setActiveServerId(chosen.id);
          setActiveBaseUrl(chosen.url);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved servers from localStorage', e);
    }

    // Default based on environment
    const defaultProfile = isLocalhost ? initialPresets[0] : initialPresets[1];
    setServers(initialPresets);
    setActiveServerId(defaultProfile.id);
    setActiveBaseUrl(defaultProfile.url);
  }, []);

  // Save servers to localStorage
  const persistServers = (updated: ServerProfile[], newActiveId?: string) => {
    setServers(updated);
    try {
      localStorage.setItem(STORAGE_SERVERS_KEY, JSON.stringify(updated));
      if (newActiveId) {
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, newActiveId);
      }
    } catch {}
  };

  // Set designated server as default
  const handleSetDefaultServer = (id: string) => {
    const updated = servers.map((s) => ({
      ...s,
      isDefault: s.id === id,
    }));
    persistServers(updated);
  };

  // Set current active server as default
  const handleSetCurrentAsDefault = () => {
    if (activeServer) {
      handleSetDefaultServer(activeServer.id);
    }
  };

  // Switch server handler
  const handleSelectServer = (server: ServerProfile) => {
    setActiveServerId(server.id);
    setActiveBaseUrl(server.url);
    try {
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, server.id);
    } catch {}
    // Trigger immediate reload
    setTimeout(() => {
      loadData();
    }, 50);
  };

  // Add new server
  const handleAddServer = async (name: string, url: string): Promise<boolean> => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (servers.some((s) => s.url.toLowerCase() === cleanUrl.toLowerCase())) {
      return false;
    }

    const newProfile: ServerProfile = {
      id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name || cleanUrl,
      url: cleanUrl,
      isDefault: false,
      addedAt: new Date().toISOString(),
    };

    const updated = [...servers, newProfile];
    persistServers(updated, newProfile.id);
    handleSelectServer(newProfile);
    return true;
  };

  // Delete server
  const handleDeleteServer = (id: string) => {
    const updated = servers.filter((s) => s.id !== id);
    let nextActiveId = activeServerId;
    if (activeServerId === id) {
      nextActiveId = updated[0]?.id || 'default-cloud';
      const nextSrv = updated[0];
      if (nextSrv) {
        setActiveBaseUrl(nextSrv.url);
      }
    }
    setActiveServerId(nextActiveId);
    persistServers(updated, nextActiveId);
  };

  // Load initial server data (loads up to 500 records)
  const loadData = useCallback(async () => {
    try {
      const [infoRes, logsRes, devicesRes] = await Promise.all([
        fetchServerInfo().catch(() => null),
        fetchLogs({ limit: 500 }).catch(() => null),
        fetchDevices().catch(() => null),
      ]);

      if (infoRes) {
        setServerInfo(infoRes);
        setUptimeSeconds(infoRes.uptimeSeconds);
      }
      if (logsRes?.items) {
        setRecords(logsRes.items);
        setStats(logsRes.stats);
      }
      if (devicesRes?.devices) {
        setDevices(devicesRes.devices);
      }
    } catch (err) {
      console.error('Failed to load server data:', err);
    }
  }, []);

  // Server Uptime ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Connect SSE for live streaming (reconnects whenever activeServer changes)
  useEffect(() => {
    loadData();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        const streamUrl = activeServer?.url ? `${activeServer.url.replace(/\/+$/, '')}/api/stream` : '/api/stream';
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          setSseConnected(true);
        };

        eventSource.addEventListener('connected', () => {
          setSseConnected(true);
        });

        eventSource.addEventListener('record_created', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data.record) {
              if (isStreamingRef.current) {
                setRecords((prev) => [data.record, ...prev.slice(0, 499)]);
              }
            }
            if (data.stats) {
              setStats(data.stats);
            }
            // Refresh devices list
            fetchDevices().then((res) => setDevices(res.devices)).catch(() => {});
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        });

        eventSource.addEventListener('logs_cleared', (event: any) => {
          setRecords([]);
          setDevices([]);
          if (event.data) {
            try {
              const d = JSON.parse(event.data);
              if (d.stats) setStats(d.stats);
            } catch {}
          }
        });

        eventSource.onerror = () => {
          setSseConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Attempt reconnection after 3 seconds
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        setSseConnected(false);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    // Continuous polling every 2s to ensure remote servers without SSE stream fresh records
    const fallbackPoll = setInterval(() => {
      loadData();
    }, 2000);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(fallbackPoll);
    };
  }, [loadData, activeServer?.url]);

  // Management actions
  const handleClearLogs = async () => {
    if (confirm('確定要清空此伺服器上目前儲存的所有遙測與心跳記錄嗎？')) {
      await clearAllLogs();
      setRecords([]);
      setDevices([]);
      loadData();
    }
  };

  const handleSeedData = async () => {
    await seedSampleData();
    loadData();
  };

  const handleOpenQuickSend = () => {
    setActiveTab('simulator');
  };

  const handleFilterDevice = (deviceId: string) => {
    setSelectedDeviceFilter(deviceId);
    setActiveTab('stream');
  };

  const handleSimulateDevice = (deviceId: string) => {
    setSimulatorDeviceId(deviceId);
    setActiveTab('simulator');
  };

  const handleDownloadProjectZip = async () => {
    await downloadProjectZipFile();
  };

  const uniqueDevices = Array.from(new Set(records.map((r) => r.deviceId)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sseConnected={sseConnected}
        onOpenQuickSend={handleOpenQuickSend}
        totalRecords={records.length}
        activeServer={activeServer}
        onOpenServerManager={() => setIsServerManagerOpen(true)}
        onDownloadProjectZip={handleDownloadProjectZip}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Public URL & Server Endpoint Banner */}
        <ServerBanner
          serverInfo={serverInfo}
          publicUrl={publicUrl}
          activeServer={activeServer}
          onOpenServerManager={() => setIsServerManagerOpen(true)}
          onDownloadProjectZip={handleDownloadProjectZip}
          onSetCurrentAsDefault={handleSetCurrentAsDefault}
        />

        {/* Global Key Metrics KPI Strip */}
        <StatsCards stats={stats} uptimeSeconds={uptimeSeconds} />

        {/* Tab View Content */}
        {activeTab === 'stream' && (
          <LiveStream
            records={records}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            onInspect={(r) => setInspectedRecord(r)}
            onClear={handleClearLogs}
            onSeed={handleSeedData}
            selectedDeviceFilter={selectedDeviceFilter}
            setSelectedDeviceFilter={setSelectedDeviceFilter}
          />
        )}

        {activeTab === 'fleet' && (
          <DeviceFleet
            devices={devices}
            onSelectDeviceFilter={handleFilterDevice}
            onSimulateForDevice={handleSimulateDevice}
          />
        )}

        {activeTab === 'simulator' && (
          <DeviceSimulator
            initialDeviceId={simulatorDeviceId}
            onPacketSent={(record) => {
              if (record) {
                setRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id).slice(0, 499)]);
              }
              loadData();
            }}
            publicUrl={publicUrl}
            onViewStream={() => setActiveTab('stream')}
          />
        )}

        {activeTab === 'docs' && (
          <ApiDocs publicUrl={publicUrl} />
        )}

        {activeTab === 'export' && (
          <ExportPanel
            records={records}
            uniqueDevices={uniqueDevices}
            publicUrl={publicUrl}
          />
        )}
      </main>

      {/* Payload Inspector Modal */}
      <InspectModal
        record={inspectedRecord}
        onClose={() => setInspectedRecord(null)}
        onSimulateDevice={handleSimulateDevice}
      />

      {/* Server Switcher & Multi-URL Manager Modal */}
      <ServerManagerModal
        isOpen={isServerManagerOpen}
        onClose={() => setIsServerManagerOpen(false)}
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={handleSelectServer}
        onSetDefaultServer={handleSetDefaultServer}
        onAddServer={handleAddServer}
        onDeleteServer={handleDeleteServer}
        currentPublicUrl={publicUrl}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            RESTful Device Observability Engine · Node.js & Express 4.21
          </div>
          <div className="font-mono text-slate-400">
            Windows · Linux · macOS 跨平台相容
          </div>
        </div>
      </footer>
    </div>
  );
}
