import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pollClientLoads, type ApConfig, type ClientLoadReport } from '../../src/services/hybrid-client-poller.js';

const mockDevices = [
  {
    'kismet.device.base.type': 'Wi-Fi Client',
    'kismet.device.base.macaddr': '11:22:33:44:55:66',
    'kismet.device.base.commonname': 'laptop-1',
    'kismet.device.base.signal': { 'kismet.common.signal.last_signal': -55 },
    'kismet.device.base.last_time': Date.now() / 1000 - 10,
    'dot11.device': { 'dot11.device.last_bssid': 'AA:BB:CC:DD:EE:01' },
  },
  {
    'kismet.device.base.type': 'Wi-Fi Client',
    'kismet.device.base.macaddr': '77:88:99:AA:BB:CC',
    'kismet.device.base.commonname': 'phone-1',
    'kismet.device.base.signal': { 'kismet.common.signal.last_signal': -70 },
    'kismet.device.base.last_time': Date.now() / 1000 - 5,
    'dot11.device': { 'dot11.device.last_bssid': 'AA:BB:CC:DD:EE:01' },
  },
  {
    'kismet.device.base.type': 'Wi-Fi Client',
    'kismet.device.base.macaddr': 'DD:EE:FF:00:11:22',
    'kismet.device.base.commonname': 'old-client',
    'kismet.device.base.signal': { 'kismet.common.signal.last_signal': -60 },
    'kismet.device.base.last_time': Date.now() / 1000 - 120,
    'dot11.device': { 'dot11.device.last_bssid': 'AA:BB:CC:DD:EE:01' },
  },
  {
    'kismet.device.base.type': 'Wi-Fi AP',
    'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:01',
    'kismet.device.base.commonname': 'AP-One',
    'kismet.device.base.signal': { 'kismet.common.signal.last_signal': -40 },
    'kismet.device.base.last_time': Date.now() / 1000,
  },
];

const aps: ApConfig[] = [
  { bssid: 'AA:BB:CC:DD:EE:01', label: 'AP-One', ipAddress: null, supportsSnmp: false, snmpOid: null, snmpCommunity: null },
  { bssid: 'AA:BB:CC:DD:EE:02', label: 'AP-Two', ipAddress: null, supportsSnmp: false, snmpOid: null, snmpCommunity: null },
];

describe('Hybrid Client Poller', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(Date.now()) });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return client loads from Kismet', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDevices),
    } as Response);

    const results = await pollClientLoads(aps, { kismetUrl: 'http://kismet:2501' });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      bssid: 'AA:BB:CC:DD:EE:01',
      name: 'AP-One',
      activeClientCount: 2,
      source: 'kismet',
    });
    expect(results[0].clients).toHaveLength(2);
    expect(results[0].clients[0].mac).toBe('11:22:33:44:55:66');
    expect(results[0].clients[1].mac).toBe('77:88:99:AA:BB:CC');
  });

  it('should return zero clients for APs with no associated clients', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDevices),
    } as Response);

    const results = await pollClientLoads(aps, { kismetUrl: 'http://kismet:2501' });

    expect(results[1]).toMatchObject({
      bssid: 'AA:BB:CC:DD:EE:02',
      name: 'AP-Two',
      activeClientCount: 0,
      source: 'kismet',
    });
    expect(results[1].clients).toHaveLength(0);
  });

  it('should use SNMP when AP supports it and transport factory is provided', async () => {
    const snmpTransport = {
      get: vi.fn().mockResolvedValue([{ oid: '.1.3.6.1.2.1.2.2.1.10.1', value: 5 }]),
      close: vi.fn(),
    };

    const snmpAps: ApConfig[] = [
      { bssid: 'AA:BB:CC:DD:EE:01', label: 'AP-SNMP', ipAddress: '192.168.1.1', supportsSnmp: true, snmpOid: '.1.3.6.1.2.1.2.2.1.10.1', snmpCommunity: 'public' },
    ];

    const results = await pollClientLoads(snmpAps, { kismetUrl: 'http://kismet:2501', createSnmpTransport: () => snmpTransport });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      bssid: 'AA:BB:CC:DD:EE:01',
      name: 'AP-SNMP',
      activeClientCount: 5,
      source: 'snmp',
    });
  });

  it('should fall back to Kismet when SNMP fails', async () => {
    const snmpTransport = {
      get: vi.fn().mockRejectedValue(new Error('SNMP timeout')),
      close: vi.fn(),
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDevices),
    } as Response);

    const snmpAps: ApConfig[] = [
      { bssid: 'AA:BB:CC:DD:EE:01', label: 'AP-Fallback', ipAddress: '192.168.1.1', supportsSnmp: true, snmpOid: '.1.3.6.1.2.1.2.2.1.10.1', snmpCommunity: 'public' },
    ];

    const results = await pollClientLoads(snmpAps, { kismetUrl: 'http://kismet:2501', createSnmpTransport: () => snmpTransport });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      bssid: 'AA:BB:CC:DD:EE:01',
      name: 'AP-Fallback',
      source: 'kismet',
    });
    expect(results[0].activeClientCount).toBeGreaterThanOrEqual(0);
  });

  it('should handle Kismet fetch failure gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const results = await pollClientLoads(aps, { kismetUrl: 'http://kismet:2501' });

    expect(results).toHaveLength(2);
    expect(results[0].activeClientCount).toBe(0);
    expect(results[1].activeClientCount).toBe(0);
  });

  it('should not fetch Kismet devices when all APs support SNMP', async () => {
    const snmpTransport = {
      get: vi.fn().mockResolvedValue([{ oid: '.1.3.6.1.2.1.2.2.1.10.1', value: 3 }]),
      close: vi.fn(),
    };

    const snmpAps: ApConfig[] = [
      { bssid: 'AA:BB:CC:DD:EE:01', label: 'AP-1', ipAddress: '192.168.1.1', supportsSnmp: true, snmpOid: '.1.3.6.1.2.1.2.2.1.10.1', snmpCommunity: 'public' },
      { bssid: 'AA:BB:CC:DD:EE:02', label: 'AP-2', ipAddress: '192.168.1.2', supportsSnmp: true, snmpOid: '.1.3.6.1.2.1.2.2.1.10.2', snmpCommunity: 'public' },
    ];

    await pollClientLoads(snmpAps, { kismetUrl: 'http://kismet:2501', createSnmpTransport: () => snmpTransport });

    expect(fetch).not.toHaveBeenCalled();
  });
});
