import type { ParsedTelemetry } from './kismet-parser.js';

export interface ChannelScore {
  channel: number;
  band: string;
  score: number;
  breakdown: string;
}

interface Breakdown {
  external: number;
  'co-channel': number;
  hardware: number;
  adjacent: number;
}

const UNKNOWN_CHANNEL = -1;
const ADJACENT_2GHZ_WINDOW = 2;
const ADJACENT_5GHZ_WINDOW = 4;
const ADJACENT_6GHZ_WINDOW = 4;

function isAdjacentChannel(a: number, b: number, band: string): boolean {
  const diff = Math.abs(a - b);
  if (diff === 0) return false;

  if (band === '2.4GHz') {
    return diff <= ADJACENT_2GHZ_WINDOW;
  }
  if (band === '5GHz') {
    return diff <= ADJACENT_5GHZ_WINDOW;
  }
  if (band === '6GHz') {
    return diff <= ADJACENT_6GHZ_WINDOW;
  }
  return false;
}

export function calculateScores(
  entries: ParsedTelemetry[],
  knownBssids: string[],
): ChannelScore[] {
  const knownSet = new Set(knownBssids);

  const groups = new Map<string, ParsedTelemetry[]>();
  const channelMap = new Map<string, number>();
  const bandMap = new Map<string, string>();

  for (const entry of entries) {
    const ch = parseInt(entry.channel, 10);
    const channel = isNaN(ch) ? UNKNOWN_CHANNEL : ch;

    const key = `${entry.band}:${channel}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      channelMap.set(key, channel);
      bandMap.set(key, entry.band);
    }
    groups.get(key)!.push(entry);
  }

  const results: ChannelScore[] = [];

  for (const [key, group] of groups) {
    const ch = channelMap.get(key)!;
    const band = bandMap.get(key)!;

    const breakdown: Breakdown = { external: 0, 'co-channel': 0, hardware: 0, adjacent: 0 };

    // External Interference (0-30): unknown BSSIDs with strong RSSI
    for (const entry of group) {
      if (knownSet.has(entry.bssid)) continue;
      if (entry.signalDb != null && entry.signalDb > -60) {
        breakdown.external += 10;
      }
    }
    breakdown.external = Math.min(breakdown.external, 30);

    // Internal Co-Channel (0-30): known AP pairs hearing each other strongly
    const knownInGroup = group.filter((e) => knownSet.has(e.bssid));
    for (let i = 0; i < knownInGroup.length; i++) {
      for (let j = i + 1; j < knownInGroup.length; j++) {
        const a = knownInGroup[i];
        const b = knownInGroup[j];
        if (
          a.signalDb != null &&
          b.signalDb != null &&
          Math.max(a.signalDb, b.signalDb) > -70
        ) {
          breakdown['co-channel'] += 15;
        }
      }
    }
    breakdown['co-channel'] = Math.min(breakdown['co-channel'], 30);

    // Hardware Load (0-20)
    let maxClients = 0;
    let maxUtilization = 0;
    for (const entry of group) {
      if (entry.clientCount != null && entry.clientCount > maxClients) {
        maxClients = entry.clientCount;
      }
      if (entry.channelUtilization != null && entry.channelUtilization > maxUtilization) {
        maxUtilization = entry.channelUtilization;
      }
    }
    breakdown.hardware = Math.round(maxClients / 5 + maxUtilization / 10);
    breakdown.hardware = Math.min(breakdown.hardware, 20);

    // Adjacent Interference (0-20): strong signals on nearby channels
    for (const [otherKey, otherGroup] of groups) {
      const otherCh = channelMap.get(otherKey)!;
      if (!isAdjacentChannel(ch, otherCh, band)) continue;

      for (const entry of otherGroup) {
        if (knownSet.has(entry.bssid)) continue;
        if (entry.signalDb != null && entry.signalDb > -65) {
          breakdown.adjacent += 5;
        }
      }
    }
    breakdown.adjacent = Math.min(breakdown.adjacent, 20);

    const total = Math.min(
      Math.max(breakdown.external + breakdown['co-channel'] + breakdown.hardware + breakdown.adjacent, 0),
      100,
    );

    results.push({
      channel: ch,
      band,
      score: total,
      breakdown: JSON.stringify(breakdown),
    });
  }

  return results;
}
