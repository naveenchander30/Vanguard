const BASE = '/api';

export interface CongestionScore {
  id: number;
  channel: number;
  band: string;
  score: number;
  breakdown: string;
  createdAt: string;
}

export interface Infrastructure {
  id: number;
  bssid: string;
  ssid: string | null;
  label: string | null;
  band: string | null;
  notes: string | null;
  ipAddress: string | null;
  supportsSnmp: boolean;
  snmpOid: string | null;
  snmpCommunity: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryEntry {
  id: number;
  bssid: string;
  ssid: string | null;
  band: string | null;
  channel: string | null;
  signalDb: number | null;
  clientCount: number | null;
  channelUtilization: number | null;
  noiseFloor: number | null;
  source: string;
  createdAt: string;
}

export interface ClientLoad {
  bssid: string;
  ssid: string;
  activeClientCount: number;
  source: string;
  lastSeen: string;
}

export async function fetchScores(): Promise<CongestionScore[]> {
  const res = await fetch(`${BASE}/scores`);
  if (!res.ok) throw new Error('Failed to fetch scores');
  return res.json();
}

export async function fetchInfrastructure(): Promise<Infrastructure[]> {
  const res = await fetch(`${BASE}/infrastructure`);
  if (!res.ok) throw new Error('Failed to fetch infrastructure');
  return res.json();
}

export async function createInfrastructure(data: Partial<Infrastructure>): Promise<Infrastructure> {
  const res = await fetch(`${BASE}/infrastructure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create infrastructure');
  return res.json();
}

export async function updateInfrastructure(id: number, data: Partial<Infrastructure>): Promise<Infrastructure> {
  const res = await fetch(`${BASE}/infrastructure/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update infrastructure');
  return res.json();
}

export async function deleteInfrastructure(id: number): Promise<void> {
  const res = await fetch(`${BASE}/infrastructure/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete infrastructure');
}

export async function fetchTelemetry(): Promise<TelemetryEntry[]> {
  const res = await fetch(`${BASE}/telemetry`);
  if (!res.ok) throw new Error('Failed to fetch telemetry');
  return res.json();
}

export function telemetryExportUrl(): string {
  return `${BASE}/telemetry/export`;
}

export function scoresStreamUrl(): string {
  return `${BASE}/scores/stream`;
}

export function clientsStreamUrl(): string {
  return `${BASE}/clients/stream`;
}

export async function fetchClients(): Promise<ClientLoad[]> {
  const res = await fetch(`${BASE}/clients`);
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
}

function subscribe<T>(url: string, onData: (data: T) => void, retryMs = 1000): () => void {
  let closed = false;
  let retryTimeout: ReturnType<typeof setTimeout>;
  let currentRetry = retryMs;

  function connect() {
    if (closed) return;
    const eventSource = new EventSource(url);
    eventSource.onmessage = (event) => {
      currentRetry = retryMs;
      try {
        const data = JSON.parse(event.data);
        onData(data);
      } catch {
        // ignore parse errors
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
      if (!closed) {
        retryTimeout = setTimeout(connect, currentRetry);
        currentRetry = Math.min(currentRetry * 1.5, 30000);
      }
    };
  }

  connect();

  return () => {
    closed = true;
    clearTimeout(retryTimeout);
  };
}

export function subscribeScores(onScore: (scores: CongestionScore[]) => void): () => void {
  return subscribe(scoresStreamUrl(), onScore);
}

export function subscribeClients(onClients: (clients: ClientLoad[]) => void): () => void {
  return subscribe(clientsStreamUrl(), onClients);
}
