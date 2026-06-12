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

export function subscribeScores(onScore: (score: CongestionScore[]) => void): () => void {
  const eventSource = new EventSource(scoresStreamUrl());
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onScore(data);
    } catch {
      // ignore parse errors
    }
  };
  eventSource.onerror = () => {
    eventSource.close();
  };
  return () => eventSource.close();
}
