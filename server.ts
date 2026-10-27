import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Types
export interface DeviceRecord {
  id: string;
  type: 'telemetry' | 'heartbeat';
  deviceId: string;
  timestamp: string;
  ip: string;
  userAgent?: string;
  status?: string;
  metrics?: Record<string, any>;
  tags?: string[];
  message?: string;
  firmwareVersion?: string;
  battery?: number;
  rssi?: number;
  uptime?: number;
  rawPayload?: any;
}

export interface DeviceSummary {
  deviceId: string;
  lastSeen: string;
  lastType: 'telemetry' | 'heartbeat';
  status: 'online' | 'warning' | 'stale' | 'offline';
  firmwareVersion?: string;
  battery?: number;
  rssi?: number;
  ip: string;
  totalPackets: number;
  lastMetrics?: Record<string, any>;
}

// ---------------- Persistent File Storage Configuration ----------------
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}
const RECORDS_FILE = path.resolve(DATA_DIR, 'telemetry_records.jsonl');
const DEVICES_FILE = path.resolve(DATA_DIR, 'devices_state.json');

// In-memory stores (synced with persistent disk files):
// 1. Real-time streaming buffer capped at 500 records max (FIFO)
const MAX_STREAM_RECORDS = 500;
let streamRecords: DeviceRecord[] = [];

// 2. Historical archive: unbounded, records ALL real-time data permanently
let allHistoricalRecords: DeviceRecord[] = [];

const devicesMap = new Map<string, DeviceSummary>();

function persistRecordToDisk(record: DeviceRecord) {
  try {
    fs.appendFileSync(RECORDS_FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    console.error('[Persistence] Error writing record to disk:', err);
  }
}

let deviceSaveTimer: NodeJS.Timeout | null = null;
function scheduleSaveDevicesToDisk() {
  if (deviceSaveTimer) return;
  deviceSaveTimer = setTimeout(() => {
    deviceSaveTimer = null;
    try {
      const obj: Record<string, DeviceSummary> = {};
      for (const [id, dev] of devicesMap.entries()) {
        obj[id] = dev;
      }
      fs.writeFileSync(DEVICES_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch {}
  }, 1000);
}

function loadPersistedDataFromDisk() {
  try {
    if (fs.existsSync(RECORDS_FILE)) {
      const raw = fs.readFileSync(RECORDS_FILE, 'utf8');
      const lines = raw.split('\n');
      const loaded: DeviceRecord[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          loaded.push(JSON.parse(trimmed));
        } catch {}
      }
      allHistoricalRecords = loaded.reverse();
      streamRecords = allHistoricalRecords.slice(0, MAX_STREAM_RECORDS);
      console.log(`[Persistence] Restored ${allHistoricalRecords.length} historical records from disk`);
    }
  } catch (err) {
    console.error('[Persistence] Error loading records from disk:', err);
  }

  try {
    if (fs.existsSync(DEVICES_FILE)) {
      const rawDevices = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
      devicesMap.clear();
      for (const [id, dev] of Object.entries(rawDevices)) {
        devicesMap.set(id, dev as DeviceSummary);
      }
    } else if (allHistoricalRecords.length > 0) {
      for (let i = allHistoricalRecords.length - 1; i >= 0; i--) {
        updateDeviceSummary(allHistoricalRecords[i]);
      }
    }
  } catch {}
}

// SSE Event listeners
const sseClients = new Set<Response>();

function broadcastSSE(data: { event: string; payload: any }) {
  const message = `event: ${data.event}\ndata: ${JSON.stringify(data.payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Keep-alive ping for SSE every 20s
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 20000);

// Helper to determine device status based on heartbeat timestamp
function updateDeviceSummary(record: DeviceRecord) {
  const existing = devicesMap.get(record.deviceId);
  const total = (existing?.totalPackets || 0) + 1;

  let calculatedStatus: 'online' | 'warning' | 'stale' | 'offline' = 'online';
  if (record.status === 'error' || record.status === 'critical') {
    calculatedStatus = 'warning';
  } else if (record.battery !== undefined && record.battery < 20) {
    calculatedStatus = 'warning';
  }

  devicesMap.set(record.deviceId, {
    deviceId: record.deviceId,
    lastSeen: record.timestamp,
    lastType: record.type,
    status: calculatedStatus,
    firmwareVersion: record.firmwareVersion || existing?.firmwareVersion || 'v1.0.0',
    battery: record.battery !== undefined ? record.battery : existing?.battery,
    rssi: record.rssi !== undefined ? record.rssi : existing?.rssi,
    ip: record.ip || existing?.ip || '127.0.0.1',
    totalPackets: total,
    lastMetrics: record.metrics || existing?.lastMetrics || {},
  });
}

function addRecord(record: DeviceRecord) {
  // 1. Stream buffer: holds latest 500 records for real-time live view (FIFO)
  streamRecords.unshift(record);
  if (streamRecords.length > MAX_STREAM_RECORDS) {
    streamRecords.pop();
  }

  // 2. Unbounded archive: records ALL real-time data permanently
  allHistoricalRecords.unshift(record);

  // 3. Immediately persist record to permanent disk storage
  persistRecordToDisk(record);

  updateDeviceSummary(record);
  scheduleSaveDevicesToDisk();

  broadcastSSE({
    event: 'record_created',
    payload: {
      record,
      device: devicesMap.get(record.deviceId),
      stats: getStatsSnapshot(),
    },
  });
}

function getStatsSnapshot() {
  const now = Date.now();
  let onlineCount = 0;
  let staleCount = 0;
  let offlineCount = 0;

  for (const device of devicesMap.values()) {
    const elapsedSec = (now - new Date(device.lastSeen).getTime()) / 1000;
    if (elapsedSec < 60) {
      onlineCount++;
    } else if (elapsedSec < 300) {
      staleCount++;
    } else {
      offlineCount++;
    }
  }

  return {
    totalRecords: allHistoricalRecords.length,
    streamRecordsCount: streamRecords.length,
    maxStreamCapacity: MAX_STREAM_RECORDS,
    totalDevices: devicesMap.size,
    onlineDevices: onlineCount,
    staleDevices: staleCount,
    offlineDevices: offlineCount,
    telemetryCount: allHistoricalRecords.filter((r) => r.type === 'telemetry').length,
    heartbeatCount: allHistoricalRecords.filter((r) => r.type === 'heartbeat').length,
  };
}

// Initial mock devices to allow immediate visual testing (never seeds if disk data exists)
function seedInitialData() {
  if (allHistoricalRecords.length > 0 || fs.existsSync(RECORDS_FILE)) return;

  const mockDevices = [
    {
      id: 'ESP32-SensNode-01',
      fw: 'v2.1.4',
      ip: '192.168.1.102',
      metrics: { temp_c: 24.8, humidity_pct: 58.2, lux: 420, vbat_v: 3.92 },
      battery: 89,
      rssi: -58,
    },
    {
      id: 'RPI4-Gateway-Main',
      fw: 'v3.0.1-linux',
      ip: '10.0.4.15',
      metrics: { cpu_usage_pct: 18.4, mem_used_mb: 512, disk_free_gb: 42.1 },
      battery: 100,
      rssi: -42,
    },
    {
      id: 'STM32-FlowMeter-B2',
      fw: 'v1.0.8',
      ip: '192.168.1.144',
      metrics: { flow_lpm: 12.6, total_liters: 1420.5, pressure_psi: 32.1 },
      battery: 74,
      rssi: -69,
    },
  ];

  const now = Date.now();
  mockDevices.forEach((dev, idx) => {
    // Heartbeat
    const hbRecord: DeviceRecord = {
      id: `hb-seed-${idx}-${Date.now()}`,
      type: 'heartbeat',
      deviceId: dev.id,
      timestamp: new Date(now - (idx * 45 + 10) * 1000).toISOString(),
      ip: dev.ip,
      status: 'online',
      firmwareVersion: dev.fw,
      battery: dev.battery,
      rssi: dev.rssi,
      uptime: 86400 * (idx + 1) + 1200,
      message: 'System nominal heartbeat ping',
    };
    addRecord(hbRecord);

    // Telemetry
    const telRecord: DeviceRecord = {
      id: `tel-seed-${idx}-${Date.now()}`,
      type: 'telemetry',
      deviceId: dev.id,
      timestamp: new Date(now - (idx * 30 + 5) * 1000).toISOString(),
      ip: dev.ip,
      metrics: dev.metrics,
      tags: ['sensor', 'production', 'edge'],
      message: 'Periodic sensor telemetry snapshot',
      firmwareVersion: dev.fw,
      battery: dev.battery,
      rssi: dev.rssi,
    };
    addRecord(telRecord);
  });
}

// 0. Server-Side Proxy Endpoint (Bypasses Browser Mixed Content & CORS restrictions)
app.all('/api/proxy', async (req: Request, res: Response) => {
  const targetUrl = (req.query.url as string || '').trim();
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target url parameter' });
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelemetryHub-Server-Proxy/1.0',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    fetchOptions.signal = controller.signal;

    const remoteRes = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    const contentType = remoteRes.headers.get('content-type') || 'application/json';
    res.status(remoteRes.status);
    res.setHeader('Content-Type', contentType);

    const data = await remoteRes.text();
    return res.send(data);
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: `Proxy error to ${targetUrl}: ${err.name === 'AbortError' ? '連線逾時 (6s)' : err.message}`,
    });
  }
});

// 1. Server info & metadata (reports public URL, platform, uptime)
app.get('/api/info', (req: Request, res: Response) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const inferredUrl = `${protocol}://${host}`;
  const publicUrl = process.env.APP_URL || inferredUrl;

  res.json({
    name: 'IoT & Device Telemetry REST Observability Server',
    status: 'healthy',
    publicUrl,
    inferredUrl,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    osRelease: os.release(),
    uptimeSeconds: Math.floor(process.uptime()),
    serverTime: new Date().toISOString(),
    stats: getStatsSnapshot(),
    apiEndpoints: [
      {
        path: '/api/heartbeat',
        methods: ['POST', 'GET'],
        description: 'Device alive ping, uptime, battery, RSSI and status tracking',
      },
      {
        path: '/api/telemetry',
        methods: ['POST', 'GET'],
        description: 'Sensor data ingestion, numeric metrics, debug logs and tags',
      },
      {
        path: '/api/stream',
        methods: ['GET'],
        description: 'Server-Sent Events (SSE) live real-time observation feed',
      },
      {
        path: '/api/devices',
        methods: ['GET'],
        description: 'List tracked edge devices with health status and metrics',
      },
      {
        path: '/api/export',
        methods: ['GET'],
        description: 'Export all records in JSON or CSV format',
      },
      {
        path: '/api/logs/clear',
        methods: ['POST'],
        description: 'Purge current logs for fresh debugging sessions',
      },
      {
        path: '/api/mock/seed',
        methods: ['POST'],
        description: 'Inject sample IoT device packets for testing',
      },
    ],
  });
});

// Universal parser supporting nested and flat IoT payloads (e.g. ESP32, Arduino, FreeRTOS)
function parseIncomingDevicePayload(body: any, clientIp: string, req: Request) {
  const deviceId = (
    body.deviceId ||
    body.device_id ||
    body.id ||
    body.mac ||
    body.client_id ||
    ''
  ).toString().trim();

  const timestamp = body.timestamp || body.timestamp_utc || body.time
    ? new Date(body.timestamp || body.timestamp_utc || body.time).toISOString()
    : new Date().toISOString();

  const firmwareVersion = (
    body.firmwareVersion ||
    body.fw_version ||
    body.firmware ||
    body.version ||
    'v1.0.0'
  ).toString();

  let battery: number | undefined = undefined;
  if (typeof body.battery === 'number') battery = body.battery;
  else if (typeof body.battery_level === 'number') battery = body.battery_level;
  else if (typeof body.bat === 'number') battery = body.bat;

  let rssi: number | undefined = undefined;
  if (typeof body.rssi === 'number') rssi = body.rssi;
  else if (typeof body.wifi_rssi === 'number') rssi = body.wifi_rssi;

  let uptime: number | undefined = undefined;
  if (typeof body.uptime === 'number') uptime = body.uptime;
  else if (typeof body.uptime_sec === 'number') uptime = body.uptime_sec;
  else if (typeof body.uptime_seconds === 'number') uptime = body.uptime_seconds;

  // Extract metrics (support both nested object and flat JSON fields)
  let metrics: Record<string, any> = {};
  if (body.metrics && typeof body.metrics === 'object') {
    metrics = { ...body.metrics };
  } else if (body.data && typeof body.data === 'object') {
    metrics = { ...body.data };
  }

  // Automatically collect all flat fields that are not reserved metadata
  const reservedKeys = new Set([
    'deviceId', 'device_id', 'id', 'mac', 'client_id',
    'timestamp', 'timestamp_utc', 'time',
    'status', 'tags', 'message', 'msg',
    'metrics', 'data', 'rawPayload',
  ]);

  for (const [k, v] of Object.entries(body)) {
    if (!reservedKeys.has(k)) {
      metrics[k] = v;
    }
  }

  return {
    deviceId,
    timestamp,
    firmwareVersion,
    battery,
    rssi,
    uptime,
    metrics,
    status: body.status || 'online',
    message: body.message || body.msg || (body.last_reset_reason ? `Reset: ${body.last_reset_reason}` : 'Device telemetry data ingested'),
    tags: Array.isArray(body.tags) ? body.tags : ['esp32', 'hardware'],
  };
}

// 2. Heartbeat API (POST: register device alive ping; GET: list recent heartbeats)
const handleHeartbeat = (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const parsed = parseIncomingDevicePayload(body, clientIp, req);

    if (!parsed.deviceId) {
      addRecord({
        id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'heartbeat',
        deviceId: 'UNKNOWN-DEVICE',
        timestamp: new Date().toISOString(),
        ip: clientIp,
        status: 'warning',
        message: '收到格式錯誤的心跳請求：缺少必要欄位 deviceId 或 device_id',
        rawPayload: body,
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required field: deviceId (or device_id)',
        hint: 'Payload must contain {"deviceId": "..."} or {"device_id": "..."}',
      });
    }

    const record: DeviceRecord = {
      id: `hb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'heartbeat',
      deviceId: parsed.deviceId,
      timestamp: parsed.timestamp,
      ip: body.ip || clientIp,
      userAgent: req.get('user-agent') || 'Device-HTTP-Client',
      status: parsed.status,
      firmwareVersion: parsed.firmwareVersion,
      battery: parsed.battery,
      rssi: parsed.rssi,
      uptime: parsed.uptime,
      message: parsed.message || 'Heartbeat ACK OK',
      rawPayload: body,
    };

    addRecord(record);

    return res.status(200).json({
      success: true,
      message: 'Heartbeat registered successfully',
      id: record.id,
      timestamp: record.timestamp,
      deviceId: record.deviceId,
      status: record.status,
      nextHeartbeatSeconds: 30,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Heartbeat processing failed: ' + (err?.message || 'Internal error'),
    });
  }
};

app.post('/api/heartbeat', handleHeartbeat);
app.post('/heartbeat', handleHeartbeat);
app.post('/api/v1/heartbeat', handleHeartbeat);

app.get('/api/heartbeat', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 500);
  const deviceId = req.query.deviceId as string;

  let filtered = streamRecords.filter((r) => r.type === 'heartbeat');
  if (deviceId) {
    filtered = filtered.filter((r) => r.deviceId.toLowerCase() === deviceId.toLowerCase());
  }

  res.json({
    success: true,
    total: filtered.length,
    items: filtered.slice(0, limit),
  });
});

// 3. Telemetry API (POST: ingest metrics; GET: query filtered telemetry)
const handleTelemetry = (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const parsed = parseIncomingDevicePayload(body, clientIp, req);

    if (!parsed.deviceId) {
      addRecord({
        id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'telemetry',
        deviceId: 'UNKNOWN-DEVICE',
        timestamp: new Date().toISOString(),
        ip: clientIp,
        status: 'warning',
        message: '收到格式錯誤的遙測請求：缺少必要欄位 deviceId 或 device_id',
        rawPayload: body,
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required field: deviceId (or device_id)',
        hint: 'Payload must contain {"deviceId": "..."} or {"device_id": "..."}',
      });
    }

    const record: DeviceRecord = {
      id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'telemetry',
      deviceId: parsed.deviceId,
      timestamp: parsed.timestamp,
      ip: body.ip || clientIp,
      userAgent: req.get('user-agent') || 'Device-HTTP-Client',
      status: parsed.status,
      metrics: parsed.metrics,
      tags: parsed.tags,
      message: parsed.message,
      firmwareVersion: parsed.firmwareVersion,
      battery: parsed.battery,
      rssi: parsed.rssi,
      uptime: parsed.uptime,
      rawPayload: body,
    };

    addRecord(record);

    return res.status(200).json({
      success: true,
      message: 'Telemetry logged successfully',
      id: record.id,
      timestamp: record.timestamp,
      deviceId: record.deviceId,
      metricsCount: Object.keys(record.metrics || {}).length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Telemetry ingestion failed: ' + (err?.message || 'Internal error'),
    });
  }
};

// Mount across common IoT ingestion paths
app.post('/api/telemetry', handleTelemetry);
app.post('/telemetry', handleTelemetry);
app.post('/api/data', handleTelemetry);
app.post('/data', handleTelemetry);
app.post('/api/upload', handleTelemetry);
app.post('/upload', handleTelemetry);
app.post('/api/v1/telemetry', handleTelemetry);
app.post('/api/device/data', handleTelemetry);

app.get('/ping', (req: Request, res: Response) => res.json({ pong: true, time: new Date().toISOString() }));

app.get('/api/telemetry', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 500);
  const deviceId = req.query.deviceId as string;

  let filtered = streamRecords.filter((r) => r.type === 'telemetry');
  if (deviceId) {
    filtered = filtered.filter((r) => r.deviceId.toLowerCase() === deviceId.toLowerCase());
  }

  res.json({
    success: true,
    total: filtered.length,
    items: filtered.slice(0, limit),
  });
});

// 4. All logs unified query (returns live stream up to 500 records by default)
app.get('/api/logs', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || MAX_STREAM_RECORDS, MAX_STREAM_RECORDS);
  const deviceId = req.query.deviceId as string;
  const type = req.query.type as string; // 'telemetry' | 'heartbeat' | 'all'
  const search = (req.query.search as string || '').toLowerCase();
  const source = req.query.source as string; // 'all' for full history, default 'stream'

  let filtered = source === 'all' ? allHistoricalRecords : streamRecords;
  if (type && type !== 'all') {
    filtered = filtered.filter((r) => r.type === type);
  }
  if (deviceId) {
    filtered = filtered.filter((r) => r.deviceId.toLowerCase() === deviceId.toLowerCase());
  }
  if (search) {
    filtered = filtered.filter((r) => 
      r.deviceId.toLowerCase().includes(search) ||
      (r.message && r.message.toLowerCase().includes(search)) ||
      (r.ip && r.ip.includes(search)) ||
      (r.metrics && JSON.stringify(r.metrics).toLowerCase().includes(search))
    );
  }

  res.json({
    success: true,
    total: filtered.length,
    items: filtered.slice(0, limit),
    stats: getStatsSnapshot(),
  });
});

// 5. Devices summary endpoint
app.get('/api/devices', (req: Request, res: Response) => {
  const now = Date.now();
  const list = Array.from(devicesMap.values()).map((d) => {
    const elapsedSec = (now - new Date(d.lastSeen).getTime()) / 1000;
    let computedStatus: 'online' | 'warning' | 'stale' | 'offline' = d.status;
    if (elapsedSec > 300) {
      computedStatus = 'offline';
    } else if (elapsedSec > 60) {
      computedStatus = 'stale';
    }
    return {
      ...d,
      status: computedStatus,
      elapsedSeconds: Math.floor(elapsedSec),
    };
  });

  list.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  res.json({
    success: true,
    devices: list,
  });
});

// 6. Server-Sent Events (SSE) for real-time live observability feed
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial connection event with current stats
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to live telemetry stream', stats: getStatsSnapshot() })}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 7. Data Export API (exports ALL historical records since server startup without upper limit)
app.get('/api/export', (req: Request, res: Response) => {
  const format = (req.query.format as string || 'json').toLowerCase();
  const deviceId = req.query.deviceId as string;
  const type = req.query.type as string;
  const source = req.query.source as string;

  // By default, exports all historical records since server startup (no upper limit!)
  let exportData = source === 'stream' ? streamRecords : allHistoricalRecords;
  if (type && type !== 'all') {
    exportData = exportData.filter((r) => r.type === type);
  }
  if (deviceId) {
    exportData = exportData.filter((r) => r.deviceId.toLowerCase() === deviceId.toLowerCase());
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'csv') {
    // Generate clean CSV
    const headers = ['id', 'type', 'deviceId', 'timestamp', 'status', 'ip', 'battery', 'rssi', 'uptime', 'message', 'metrics'];
    const rows = exportData.map((r) => {
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

    const csvContent = [headers.join(','), ...rows].join('\n') + '\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="device-telemetry-export-${timestampStr}.csv"`);
    return res.send('\uFEFF' + csvContent); // UTF-8 BOM for Excel compatibility
  }

  // Default JSON export
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="device-telemetry-export-${timestampStr}.json"`);
  return res.send(JSON.stringify(exportData, null, 2));
});

// 7.1 Full project package ZIP download
app.get('/api/project/download-zip', (req: Request, res: Response) => {
  try {
    const timestampStr = new Date().toISOString().slice(0, 10);
    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="telemetry-rest-server-${timestampStr}.zip"`);

    archive.pipe(res);

    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Add root project files
    const rootFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'server.ts',
      'server.js',
      'start.bat',
      'start.ps1',
      'start.sh',
      '.env.example',
      '.gitignore',
      'metadata.json',
      'README.md',
      'Dockerfile',
      'docker-compose.yml',
      'render.yaml',
    ];

    for (const f of rootFiles) {
      const fullPath = path.resolve(__dirname, f);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: f });
      }
    }

    // Add src directory
    const srcDir = path.resolve(__dirname, 'src');
    if (fs.existsSync(srcDir)) {
      archive.directory(srcDir, 'src');
    }

    // Add dist directory (pre-built frontend bundle)
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      archive.directory(distDir, 'dist');
    }

    archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Archive creation error: ' + err.message });
    }
  }
});

// 8. Management: Clear logs (with automatic backup)
app.all('/api/logs/clear', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(RECORDS_FILE)) {
      const backupPath = path.resolve(DATA_DIR, `backup_cleared_${Date.now()}.jsonl`);
      fs.copyFileSync(RECORDS_FILE, backupPath);
      console.log(`[Persistence] Safety backup saved to: ${backupPath}`);
    }
    fs.writeFileSync(RECORDS_FILE, '', 'utf8');
    fs.writeFileSync(DEVICES_FILE, '{}', 'utf8');
    streamRecords = [];
    allHistoricalRecords = [];
    devicesMap.clear();
    broadcastSSE({
      event: 'logs_cleared',
      payload: { stats: getStatsSnapshot() },
    });
    res.json({ success: true, message: 'All telemetry and heartbeat logs cleared and backed up safely' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Mock Seed endpoint
app.post('/api/mock/seed', (req: Request, res: Response) => {
  seedInitialData();
  res.json({ success: true, message: 'Sample IoT devices seeded', stats: getStatsSnapshot() });
});

// Load persistent data from disk on boot
loadPersistedDataFromDisk();

// Seed data on server start only if database is completely empty
seedInitialData();

// ---------------- Vite / Frontend static mounting ----------------
async function startServer() {
  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.resolve(distDir, 'index.html');

  // If dist/index.html exists, serve compiled static assets instantly
  if (fs.existsSync(distIndex)) {
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(distIndex);
    });
  } else {
    // Development fallback with Vite middleware (only loaded if dist doesn't exist)
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e: any) {
      console.warn('Vite dev middleware could not be loaded:', e?.message || e);
    }
  }

  function listenWithRetry(port: number, maxRetries = 10): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = app.listen(port, '0.0.0.0');

      server.on('listening', () => {
        console.log(`========================================================`);
        console.log(`[REST Server] Observability engine listening on port ${port}`);
        console.log(`[REST Server] Network Access: http://127.0.0.1:${port}`);
        console.log(`[REST Server] Localhost:      http://localhost:${port}`);
        console.log(`========================================================`);

        // Automatically open browser on desktop systems (Windows / macOS) once listening
        if (process.platform === 'win32') {
          import('child_process').then(({ exec }) => {
            exec(`start "" "http://127.0.0.1:${port}"`);
          }).catch(() => {});
        } else if (process.platform === 'darwin') {
          import('child_process').then(({ exec }) => {
            exec(`open "http://127.0.0.1:${port}"`);
          }).catch(() => {});
        }

        resolve(port);
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && maxRetries > 0) {
          console.warn(`[REST Server] Port ${port} is occupied, trying port ${port + 1}...`);
          server.close();
          listenWithRetry(port + 1, maxRetries - 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  await listenWithRetry(PORT);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
