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
  elapsedSeconds?: number;
}

export interface ServerStats {
  totalRecords: number;
  totalDevices: number;
  onlineDevices: number;
  staleDevices: number;
  offlineDevices: number;
  telemetryCount: number;
  heartbeatCount: number;
}

export interface ServerInfo {
  name: string;
  status: string;
  publicUrl: string;
  inferredUrl: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  osRelease: string;
  uptimeSeconds: number;
  serverTime: string;
  stats: ServerStats;
  apiEndpoints: Array<{
    path: string;
    methods: string[];
    description: string;
  }>;
}

export interface ServerProfile {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
  addedAt: string;
  latencyMs?: number;
  isReachable?: boolean;
}

