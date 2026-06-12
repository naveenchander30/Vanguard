import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPollingScheduler } from '../../src/services/polling-scheduler.js';
import type { ParsedTelemetry } from '../../src/services/kismet-parser.js';
import type { RouterConfig, SnmpPollResult } from '../../src/services/snmp-poller.js';

describe('Polling Scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call kismet poller on interval', async () => {
    const entry: ParsedTelemetry = {
      bssid: 'AA:BB:CC:DD:EE:FF',
      ssid: 'Test',
      band: '5GHz',
      channel: '36',
      source: 'kismet',
    };
    const kismetPoll = vi.fn().mockResolvedValue([entry]);
    const store = vi.fn().mockResolvedValue(undefined);

    const scheduler = createPollingScheduler({
      kismetIntervalMs: 1000,
      snmpIntervalMs: 5000,
      kismetPoller: kismetPoll,
      storeTelemetry: store,
    });

    await scheduler.start();

    expect(kismetPoll).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledWith([entry]);

    await vi.advanceTimersByTimeAsync(1000);
    expect(kismetPoll).toHaveBeenCalledTimes(2);
    expect(store).toHaveBeenCalledTimes(2);

    await scheduler.stop();
  });

  it('should call snmp poller on its interval', async () => {
    const snmpResult: SnmpPollResult = {
      hostname: '192.168.1.1',
      telemetry: [],
    };
    const snmpPoll = vi.fn().mockResolvedValue(snmpResult);
    const store = vi.fn().mockResolvedValue(undefined);

    const routerConfig: RouterConfig = {
      host: '192.168.1.1',
      community: 'public',
      bssidMappings: [],
    };

    const scheduler = createPollingScheduler({
      kismetIntervalMs: 5000,
      snmpIntervalMs: 1000,
      kismetPoller: vi.fn().mockResolvedValue([]),
      snmpPoller: snmpPoll,
      routerConfigs: [routerConfig],
      storeTelemetry: store,
    });

    await scheduler.start();
    expect(snmpPoll).toHaveBeenCalledTimes(1);
    expect(snmpPoll).toHaveBeenCalledWith(routerConfig);

    await vi.advanceTimersByTimeAsync(1000);
    expect(snmpPoll).toHaveBeenCalledTimes(2);

    await scheduler.stop();
  });

  it('should store parsed Kismet telemetry', async () => {
    const telemetry: ParsedTelemetry[] = [
      {
        bssid: 'AA:BB:CC:DD:EE:FF',
        ssid: 'Test AP',
        band: '5GHz',
        channel: '36',
        signalDb: -60,
        source: 'kismet',
      },
    ];
    const kismetPoll = vi.fn().mockResolvedValue(telemetry);
    const store = vi.fn().mockResolvedValue(undefined);

    const scheduler = createPollingScheduler({
      kismetIntervalMs: 1000,
      snmpIntervalMs: 5000,
      kismetPoller: kismetPoll,
      storeTelemetry: store,
    });

    await scheduler.start();
    expect(store).toHaveBeenCalledWith(telemetry);

    await scheduler.stop();
  });

  it('should handle poller errors without crashing', async () => {
    const kismetPoll = vi.fn().mockRejectedValue(new Error('Connection refused'));
    const store = vi.fn().mockResolvedValue(undefined);

    const scheduler = createPollingScheduler({
      kismetIntervalMs: 1000,
      snmpIntervalMs: 5000,
      kismetPoller: kismetPoll,
      storeTelemetry: store,
    });

    await expect(scheduler.start()).resolves.toBeUndefined();
    expect(kismetPoll).toHaveBeenCalledTimes(1);
    expect(store).not.toHaveBeenCalled();

    await scheduler.stop();
  });

  it('should stop all intervals on stop()', async () => {
    const entry: ParsedTelemetry = {
      bssid: 'AA:BB:CC:DD:EE:FF',
      ssid: 'Test',
      band: '5GHz',
      channel: '36',
      source: 'kismet',
    };
    const kismetPoll = vi.fn().mockResolvedValue([entry]);
    const store = vi.fn().mockResolvedValue(undefined);

    const scheduler = createPollingScheduler({
      kismetIntervalMs: 1000,
      snmpIntervalMs: 1000,
      kismetPoller: kismetPoll,
      storeTelemetry: store,
    });

    await scheduler.start();
    await scheduler.stop();

    const callCountAfterStop = kismetPoll.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(kismetPoll.mock.calls.length).toBe(callCountAfterStop);
  });

  it('should handle multiple SNMP routers', async () => {
    const snmpResult: SnmpPollResult = {
      hostname: 'router',
      telemetry: [],
    };
    const snmpPoll = vi.fn().mockResolvedValue(snmpResult);
    const store = vi.fn().mockResolvedValue(undefined);

    const routerConfigs: RouterConfig[] = [
      { host: '192.168.1.1', community: 'public', bssidMappings: [] },
      { host: '192.168.1.2', community: 'private', bssidMappings: [] },
    ];

    const scheduler = createPollingScheduler({
      kismetIntervalMs: 5000,
      snmpIntervalMs: 1000,
      snmpPoller: snmpPoll,
      routerConfigs,
      storeTelemetry: store,
    });

    await scheduler.start();
    expect(snmpPoll).toHaveBeenCalledTimes(2);
    expect(snmpPoll).toHaveBeenCalledWith(routerConfigs[0]);
    expect(snmpPoll).toHaveBeenCalledWith(routerConfigs[1]);

    await scheduler.stop();
  });
});
