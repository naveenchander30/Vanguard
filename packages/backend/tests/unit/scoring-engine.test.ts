import { describe, it, expect } from 'vitest';
import { calculateScores } from '../../src/services/scoring-engine.js';
import type { ParsedTelemetry } from '../../src/services/kismet-parser.js';

function telem(overrides: Partial<ParsedTelemetry> & { bssid: string }): ParsedTelemetry {
  return {
    ssid: '',
    band: '5GHz',
    channel: '36',
    source: 'kismet',
    ...overrides,
  };
}

describe('Scoring Engine', () => {
  it('should return empty array for no telemetry', () => {
    const result = calculateScores([], []);
    expect(result).toEqual([]);
  });

  it('should return score 0 for a channel with only low-signal external APs', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:EE:01', band: '5GHz', channel: '36', signalDb: -85 }),
      telem({ bssid: 'AA:BB:CC:DD:EE:02', band: '5GHz', channel: '36', signalDb: -90 }),
    ];
    const result = calculateScores(entries, []);
    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe(36);
    expect(result[0].band).toBe('5GHz');
    expect(result[0].score).toBe(0);
  });

  it('should penalize strong external APs on a channel', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:EE:01', band: '5GHz', channel: '36', signalDb: -55 }),
    ];
    const knownBssids: string[] = [];
    const result = calculateScores(entries, knownBssids);
    expect(result[0].score).toBeGreaterThan(0);
    expect(result[0].breakdown).toContain('external');
  });

  it('should not penalize known infrastructure APs as external interference', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:EE:01', band: '5GHz', channel: '36', signalDb: -55, ssid: 'Office-5G' }),
    ];
    const knownBssids = ['AA:BB:CC:DD:EE:01'];
    const result = calculateScores(entries, knownBssids);
    expect(result[0].score).toBe(0);
  });

  it('should penalize co-channel contention between known APs', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:01', band: '5GHz', channel: '36', signalDb: -60 }),
      telem({ bssid: 'AA:BB:CC:DD:02', band: '5GHz', channel: '36', signalDb: -65 }),
    ];
    const knownBssids = ['AA:BB:CC:DD:01', 'AA:BB:CC:DD:02'];
    const result = calculateScores(entries, knownBssids);
    expect(result[0].score).toBeGreaterThan(0);
    expect(result[0].breakdown).toContain('co-channel');
  });

  it('should not penalize co-channel if known APs are far apart', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:01', band: '5GHz', channel: '36', signalDb: -85 }),
      telem({ bssid: 'AA:BB:CC:DD:02', band: '5GHz', channel: '36', signalDb: -90 }),
    ];
    const knownBssids = ['AA:BB:CC:DD:01', 'AA:BB:CC:DD:02'];
    const result = calculateScores(entries, knownBssids);
    expect(result[0].score).toBe(0);
  });

  it('should incorporate hardware load (client count and channel utilization)', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:01', band: '5GHz', channel: '36', clientCount: 15, channelUtilization: 50, source: 'snmp' }),
    ];
    const knownBssids = ['AA:BB:CC:DD:01'];
    const result = calculateScores(entries, knownBssids);
    expect(result[0].score).toBeGreaterThan(0);
    expect(result[0].breakdown).toContain('hardware');
  });

  it('should penalize adjacent channel interference in 2.4GHz', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:01', band: '2.4GHz', channel: '6', signalDb: -75 }),
      telem({ bssid: 'AA:BB:CC:DD:02', band: '2.4GHz', channel: '5', signalDb: -60 }),
      telem({ bssid: 'AA:BB:CC:DD:03', band: '2.4GHz', channel: '7', signalDb: -55 }),
    ];
    const knownBssids = ['AA:BB:CC:DD:01'];
    const result = calculateScores(entries, knownBssids);
    const ch6Result = result.find((r) => r.channel === 6);
    expect(ch6Result).toBeDefined();
    expect(ch6Result!.score).toBeGreaterThan(0);
    expect(ch6Result!.breakdown).toContain('adjacent');
  });

  it('should score multiple channels independently', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:01', band: '5GHz', channel: '36', signalDb: -55 }),
      telem({ bssid: 'AA:BB:CC:DD:02', band: '5GHz', channel: '149', signalDb: -85 }),
    ];
    const result = calculateScores(entries, []);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.channel === 36)!.score).toBeGreaterThan(0);
    expect(result.find((r) => r.channel === 149)!.score).toBe(0);
  });

  it('should clamp score between 0 and 100', () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      telem({ bssid: `AA:BB:CC:DD:${String(i).padStart(2, '0')}`, band: '2.4GHz', channel: '1', signalDb: -40 })
    );
    const result = calculateScores(entries, []);
    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(100);
  });

  it('should include breakdown JSON in result', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:01', band: '5GHz', channel: '36', signalDb: -50, clientCount: 10 }),
    ];
    const result = calculateScores(entries, []);
    expect(result[0].breakdown).toBeDefined();
    expect(() => JSON.parse(result[0].breakdown!)).not.toThrow();
  });

  it('should handle 6GHz band channels', () => {
    const entries = [
      telem({ bssid: 'AA:BB:CC:DD:01', band: '6GHz', channel: '5', signalDb: -50 }),
    ];
    const result = calculateScores(entries, []);
    expect(result).toHaveLength(1);
    expect(result[0].band).toBe('6GHz');
    expect(result[0].score).toBeGreaterThan(0);
  });
});
