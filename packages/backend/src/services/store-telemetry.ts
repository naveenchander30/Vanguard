import type { ParsedTelemetry } from './kismet-parser.js';
import { getPrisma } from '../db/prisma.js';

export async function storeTelemetry(entries: ParsedTelemetry[]): Promise<void> {
  try {
    const prisma = getPrisma();
    await prisma.telemetryLog.createMany({
      data: entries.map((e) => ({
        bssid: e.bssid,
        ssid: e.ssid,
        band: e.band,
        channel: e.channel,
        signalDb: e.signalDb ?? null,
        clientCount: e.clientCount ?? null,
        channelUtilization: e.channelUtilization ?? null,
        noiseFloor: e.noiseFloor ?? null,
        source: e.source,
      })),
    });
  } catch (err) {
    console.error('Failed to store telemetry:', err);
  }
}
