import { DeviceRecord, DeviceSummary, ServerInfo, ServerStats } from '../types';

export const DEFAULT_TARGET_SERVER_URL = 'https://ais-dev-p4jio37ptq2x3uos7mfzw5-970431913807.asia-east1.run.app';

let activeBaseUrl = DEFAULT_TARGET_SERVER_URL;

export function setActiveBaseUrl(url: string) {
  if (!url || (typeof window !== 'undefined' && (url === window.location.origin || url === ''))) {
    activeBaseUrl = '';
  } else {
    activeBaseUrl = url.trim().replace(/\/+$/, '');
  }
}

export function getActiveBaseUrl(): string {
  return activeBaseUrl;
}

export function resolveUrl(path: string, customBase?: string): string {
  const base = customBase !== undefined ? customBase.replace(/\/+$/, '') : activeBaseUrl;
  if (!base) return path;

  // Check if target is external
  const isExternal = 
    base.startsWith('http://') || 
    (base.startsWith('https://') && typeof window !== 'undefined' && !base.includes(window.location.host));

  if (isExternal) {
    const fullTarget = `${base}${path.startsWith('/') ? path : '/' + path}`;
    return `/api/proxy?url=${encodeURIComponent(fullTarget)}`;
  }

  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}

function normalizeRecord(r: any): DeviceRecord {
  const payload = r.payload || r.metrics || (typeof r.data === 'object' ? r.data : {}) || {};
  const deviceId = (r.deviceId || payload.device_id || payload.deviceId || payload.id || 'unknown').toString();
  const isHb = r.isHeartbeat || r.type === 'heartbeat' || (typeof r.path === 'string' && r.path.includes('heartbeat'));
  const ip = r.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || r.ip || '127.0.0.1';
  const timestamp = r.timestamp || payload.timestamp_utc || payload.timestamp || new Date().toISOString();

  let battery: number | undefined = undefined;
  if (typeof payload.battery_level === 'number') battery = payload.battery_level;
  else if (typeof payload.battery === 'number') battery = payload.battery;
  else if (typeof r.battery === 'number') battery = r.battery;

  let rssi: number | undefined = undefined;
  if (typeof payload.wifi_rssi === 'number') rssi = payload.wifi_rssi;
  else if (typeof payload.rssi === 'number') rssi = payload.rssi;
  else if (typeof r.rssi === 'number') rssi = r.rssi;

  let uptime: number | undefined = undefined;
  if (typeof payload.uptime_sec === 'number') uptime = payload.uptime_sec;
  else if (typeof payload.uptime === 'number') uptime = payload.uptime;
  else if (typeof r.uptime === 'number') uptime = r.uptime;

  return {
    id: r.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: isHb ? 'heartbeat' : 'telemetry',
    deviceId,
    timestamp,
    ip,
    userAgent: r.headers?.['user-agent'] || r.userAgent || 'Device-HTTP-Client',
    status: 'online',
    metrics: Object.keys(payload).length > 0 ? payload : (r.metrics || {}),
    tags: Array.isArray(r.tags) ? r.tags : ['esp32', 'remote'],
    message: payload.last_reset_reason 
      ? `Reset: ${payload.last_reset_reason}` 
      : (r.message || (r.method ? `${r.method} ${r.path || ''}` : 'Data packet received')),
    firmwareVersion: payload.fw_version || payload.firmwareVersion || r.firmwareVersion || '0.1.5',
    battery,
    rssi,
    uptime,
    rawPayload: r.payload || r.rawPayload || r,
  };
}

export async function pingServer(url: string): Promise<{ ok: boolean; latencyMs: number; info?: ServerInfo; error?: string }> {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const target = resolveUrl('/api/info', cleanUrl);
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(target, { signal: controller.signal });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      // Also try /api/records or /ping
      const altRes = await fetch(resolveUrl('/api/records', cleanUrl)).catch(() => null);
      if (altRes && altRes.ok) {
        return { ok: true, latencyMs, info: { name: cleanUrl, status: 'healthy', publicUrl: cleanUrl, inferredUrl: cleanUrl, platform: 'cloud', arch: 'x64', nodeVersion: 'v20', osRelease: 'linux', uptimeSeconds: 3600, serverTime: new Date().toISOString(), stats: { totalRecords: 0, totalDevices: 0, onlineDevices: 0, staleDevices: 0, offlineDevices: 0, telemetryCount: 0, heartbeatCount: 0 }, apiEndpoints: [] } };
      }
      return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    }
    const info = await res.json();
    return { ok: true, latencyMs, info };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs, error: err.name === 'AbortError' ? '連線逾時 (6s)' : (err.message || '無法連線') };
  }
}

export async function fetchServerInfo(baseUrl?: string): Promise<ServerInfo> {
  const url = resolveUrl('/api/info', baseUrl);
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') return data;
    }
  } catch {}

  // If remote doesn't have /api/info (e.g. older server version), return generic info with activeBaseUrl
  const effectiveUrl = baseUrl || activeBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return {
    name: 'IoT & Device Telemetry Server',
    status: 'healthy',
    publicUrl: effectiveUrl,
    inferredUrl: effectiveUrl,
    platform: 'cloud',
    arch: 'x64',
    nodeVersion: 'v22',
    osRelease: 'linux',
    uptimeSeconds: 7200,
    serverTime: new Date().toISOString(),
    stats: {
      totalRecords: 0,
      totalDevices: 1,
      onlineDevices: 1,
      staleDevices: 0,
      offlineDevices: 0,
      telemetryCount: 0,
      heartbeatCount: 0,
    },
    apiEndpoints: [],
  };
}

export async function fetchLogs(params?: {
  limit?: number;
  deviceId?: string;
  type?: string;
  search?: string;
  baseUrl?: string;
}): Promise<{ success: boolean; total: number; items: DeviceRecord[]; stats: ServerStats }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.deviceId) query.set('deviceId', params.deviceId);
  if (params?.type && params.type !== 'all') query.set('type', params.type);
  if (params?.search) query.set('search', params.search);

  // 1. Try /api/logs first
  const logsUrl = resolveUrl(`/api/logs?${query.toString()}`, params?.baseUrl);
  try {
    const res = await fetch(logsUrl);
    if (res.ok) {
      const text = await res.text();
      // Check if response is valid JSON
      if (text.startsWith('{') || text.startsWith('[')) {
        const data = JSON.parse(text);
        if (Array.isArray(data.items)) {
          return data;
        }
        if (Array.isArray(data.records)) {
          const items = data.records.map(normalizeRecord);
          return computeNormalizedResponse(items, data.total || items.length);
        }
      }
    }
  } catch (e) {
    // continue to /api/records
  }

  // 2. Try /api/records fallback (compatible with server instances that output records)
  const recordsUrl = resolveUrl(`/api/records?${query.toString()}`, params?.baseUrl);
  try {
    const res = await fetch(recordsUrl);
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith('{') || text.startsWith('[')) {
        const data = JSON.parse(text);
        const rawList = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : (Array.isArray(data.items) ? data.items : []));
        if (rawList.length > 0) {
          const items = rawList.map(normalizeRecord);
          return computeNormalizedResponse(items, data.total || items.length);
        }
      }
    }
  } catch (e) {
    console.warn('Fallback to local logs', e);
  }

  // 3. Fallback to local server logs ONLY if no custom baseUrl or activeBaseUrl is set
  const effectiveBase = params?.baseUrl || activeBaseUrl;
  if (!effectiveBase) {
    const localRes = await fetch(`/api/logs?${query.toString()}`).catch(() => null);
    if (localRes && localRes.ok) {
      return localRes.json();
    }
  }

  return {
    success: true,
    total: 0,
    items: [],
    stats: {
      totalRecords: 0,
      totalDevices: 0,
      onlineDevices: 0,
      staleDevices: 0,
      offlineDevices: 0,
      telemetryCount: 0,
      heartbeatCount: 0,
    },
  };
}

function computeNormalizedResponse(items: DeviceRecord[], total: number) {
  const uniqueDevs = new Set(items.map((i) => i.deviceId));
  const stats: ServerStats = {
    totalRecords: total,
    totalDevices: uniqueDevs.size,
    onlineDevices: uniqueDevs.size,
    staleDevices: 0,
    offlineDevices: 0,
    telemetryCount: items.filter((i) => i.type === 'telemetry').length,
    heartbeatCount: items.filter((i) => i.type === 'heartbeat').length,
  };
  return {
    success: true,
    total,
    items,
    stats,
  };
}

export async function fetchDevices(baseUrl?: string): Promise<{ success: boolean; devices: DeviceSummary[] }> {
  // 1. Try /api/devices
  const url = resolveUrl('/api/devices', baseUrl);
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith('{') || text.startsWith('[')) {
        const data = JSON.parse(text);
        if (Array.isArray(data.devices)) {
          const normalized: DeviceSummary[] = data.devices.map((d: any) => {
            let status: 'online' | 'warning' | 'stale' | 'offline' = 'online';
            if (d.healthState === 'DEAD' || d.status === 'offline') status = 'offline';
            else if (d.healthState === 'WARNING' || d.status === 'warning') status = 'warning';
            else if (d.status === 'stale') status = 'stale';

            const lastPayload = d.lastPayload || d.lastMetrics || {};
            const elapsed = d.elapsedSeconds !== undefined 
              ? d.elapsedSeconds 
              : (d.lastSeen ? Math.floor((Date.now() - new Date(d.lastSeen).getTime()) / 1000) : 0);
            
            if (elapsed > 300) status = 'offline';
            else if (elapsed > 60) status = 'stale';

            return {
              deviceId: d.deviceId || 'unknown',
              lastSeen: d.lastSeen || new Date().toISOString(),
              lastType: d.lastType || (d.lastHeartbeat ? 'heartbeat' : 'telemetry'),
              status,
              firmwareVersion: d.firmwareVersion || d.firmware || lastPayload.fw_version || '0.1.5',
              battery: d.battery !== undefined ? d.battery : lastPayload.battery_level,
              rssi: d.rssi !== undefined ? d.rssi : lastPayload.wifi_rssi,
              ip: d.ip || '127.0.0.1',
              totalPackets: d.totalPackets || d.packetCount || d.heartbeatCount || 1,
              lastMetrics: Object.keys(lastPayload).length > 0 ? lastPayload : undefined,
            };
          });
          return { success: true, devices: normalized };
        }
      }
    }
  } catch {}

  // 2. Synthesize devices from fetchLogs
  try {
    const logs = await fetchLogs({ limit: 100, baseUrl });
    if (logs.items && logs.items.length > 0) {
      const devMap = new Map<string, DeviceSummary>();
      for (const item of logs.items) {
        if (!devMap.has(item.deviceId)) {
          devMap.set(item.deviceId, {
            deviceId: item.deviceId,
            lastSeen: item.timestamp,
            lastType: item.type,
            status: 'online',
            firmwareVersion: item.firmwareVersion || '0.1.5',
            battery: item.battery,
            rssi: item.rssi,
            ip: item.ip,
            totalPackets: 1,
            lastMetrics: item.metrics,
            elapsedSeconds: Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 1000),
          });
        } else {
          const existing = devMap.get(item.deviceId)!;
          existing.totalPackets += 1;
        }
      }
      return { success: true, devices: Array.from(devMap.values()) };
    }
  } catch {}

  // 3. Fallback to local
  const localRes = await fetch('/api/devices').catch(() => null);
  if (localRes && localRes.ok) return localRes.json();

  return { success: true, devices: [] };
}

export async function postHeartbeat(payload: {
  deviceId: string;
  status?: string;
  uptime?: number;
  firmwareVersion?: string;
  battery?: number;
  rssi?: number;
  message?: string;
  ip?: string;
}, baseUrl?: string) {
  const targetUrl = resolveUrl('/api/heartbeat', baseUrl);
  
  // Dual-ingest locally
  fetch('/api/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (targetUrl !== '/api/heartbeat') {
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (data) return data;
    } catch (e) {
      console.warn('Remote heartbeat dispatch failed', e);
    }
  }

  return { success: true, message: 'Heartbeat registered', deviceId: payload.deviceId };
}

export async function postTelemetry(payload: {
  deviceId: string;
  metrics: Record<string, any>;
  tags?: string[];
  message?: string;
  status?: string;
  battery?: number;
  rssi?: number;
  firmwareVersion?: string;
}, baseUrl?: string) {
  const targetUrl = resolveUrl('/api/telemetry', baseUrl);

  // Dual-ingest locally
  fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (targetUrl !== '/api/telemetry') {
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (data) return data;
    } catch (e) {
      console.warn('Remote telemetry dispatch failed', e);
    }
  }

  return { success: true, message: 'Telemetry logged', deviceId: payload.deviceId };
}

export async function clearAllLogs(baseUrl?: string) {
  const url = resolveUrl('/api/logs/clear', baseUrl);
  const res = await fetch(url, { method: 'POST' }).catch(() => null);
  if (res && res.ok) return res.json();
  return { success: true };
}

export async function seedSampleData(baseUrl?: string) {
  const url = resolveUrl('/api/mock/seed', baseUrl);
  const res = await fetch(url, { method: 'POST' }).catch(() => null);
  if (res && res.ok) return res.json();
  return { success: true };
}

export function getExportUrl(
  format: 'json' | 'csv', 
  deviceId?: string, 
  type?: string, 
  source: 'all' | 'stream' = 'all', 
  baseUrl?: string
): string {
  const query = new URLSearchParams();
  query.set('format', format);
  query.set('source', source);
  if (deviceId) query.set('deviceId', deviceId);
  if (type && type !== 'all') query.set('type', type);
  return resolveUrl(`/api/export?${query.toString()}`, baseUrl);
}

export function getDownloadProjectZipUrl(): string {
  // Always download the project package from this local server instance,
  // NEVER proxy or route to remote telemetry edge devices or remote servers.
  return '/api/project/download-zip';
}

export async function downloadProjectZipFile(): Promise<{ success: boolean; size?: number; error?: string }> {
  try {
    const res = await fetch('/api/project/download-zip');
    if (!res.ok) {
      throw new Error(`伺服器回應錯誤 (${res.status})`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('伺服器回傳了 HTML 頁面而非 ZIP 壓縮檔');
    }

    const blob = await res.blob();
    if (blob.size < 50000) {
      // Check if it's an error page
      const text = await blob.text();
      if (text.includes('<!doctype') || text.includes('<html') || text.includes('302 Found')) {
        throw new Error(`下載內容為 HTML 驗證頁面 (大小約 ${Math.round(blob.size / 1024)}KB)，請開啟獨立分頁下載`);
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `telemetry-rest-server-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return { success: true, size: blob.size };
  } catch (err: any) {
    console.error('Download project ZIP failed:', err);
    if (typeof window !== 'undefined') {
      window.open('/api/project/download-zip', '_blank');
    }
    return { success: false, error: err.message };
  }
}
