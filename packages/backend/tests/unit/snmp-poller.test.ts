import { describe, it, expect, vi } from 'vitest';
import { createSnmpPoller, type SnmpTransport, type RouterConfig } from '../../src/services/snmp-poller.js';

function mockTransport(values: Record<string, number>): SnmpTransport {
  return {
    get: async (oids: string[]) => {
      return oids.map((oid) => {
        const val = values[oid];
        if (val === undefined) {
          return { oid, value: undefined };
        }
        return { oid, value: val };
      });
    },
    close: async () => {},
  };
}

describe('SNMP Poller', () => {
  it('should parse router hostname from OID response', async () => {
    const transport = mockTransport({
      '1.3.6.1.2.1.1.5.0': 0,
    });
    const config: RouterConfig = {
      host: '192.168.1.1',
      community: 'public',
      oids: {
        hostname: '1.3.6.1.2.1.1.5.0',
      },
    };

    const poller = createSnmpPoller(transport);
    const result = await poller.pollOnce(config);
    expect(result.hostname).toBeDefined();
  });

  it('should return parsed telemetry entries for each BSSID mapping', async () => {
    const transport = mockTransport({
      '1.3.6.1.4.1.14179.2.1.1.1.38': 8,
    });

    const config: RouterConfig = {
      host: '192.168.1.1',
      community: 'public',
      bssidMappings: [
        {
          bssid: 'AA:BB:CC:DD:EE:01',
          label: 'Office AP 2.4G',
          clientOid: '1.3.6.1.4.1.14179.2.1.1.1.38',
          utilizationOid: '1.3.6.1.4.1.9.9.150.1.1.3.1.5',
        },
      ],
    };

    const poller = createSnmpPoller(transport);
    const result = await poller.pollOnce(config);
    expect(result.telemetry).toHaveLength(1);
    expect(result.telemetry[0].bssid).toBe('AA:BB:CC:DD:EE:01');
    expect(result.telemetry[0].clientCount).toBe(8);
    expect(result.telemetry[0].source).toBe('snmp');
  });

  it('should handle missing OID values gracefully', async () => {
    const transport = mockTransport({
      '1.3.6.1.4.1.14179.2.1.1.1.38': undefined as unknown as number,
    });

    const config: RouterConfig = {
      host: '192.168.1.1',
      community: 'public',
      bssidMappings: [
        {
          bssid: 'AA:BB:CC:DD:EE:01',
          label: 'Test AP',
          clientOid: '1.3.6.1.4.1.14179.2.1.1.1.38',
        },
      ],
    };

    const poller = createSnmpPoller(transport);
    const result = await poller.pollOnce(config);
    expect(result.telemetry[0].clientCount).toBeUndefined();
  });

  it('should return empty telemetry when no BSSID mappings configured', async () => {
    const transport = mockTransport({});
    const config: RouterConfig = {
      host: '192.168.1.1',
      community: 'public',
      bssidMappings: [],
    };

    const poller = createSnmpPoller(transport);
    const result = await poller.pollOnce(config);
    expect(result.telemetry).toHaveLength(0);
    expect(result.hostname).toBe('192.168.1.1');
  });

  it('should collect all unique OIDs before querying', async () => {
    const seenOids: string[][] = [];
    const transport: SnmpTransport = {
      get: async (oids: string[]) => {
        seenOids.push([...oids]);
        return oids.map((oid) => ({ oid, value: 0 }));
      },
      close: async () => {},
    };

    const config: RouterConfig = {
      host: '192.168.1.1',
      community: 'public',
      bssidMappings: [
        { bssid: 'AA:BB:CC:DD:EE:01', label: 'AP1', clientOid: '1.3.6.1.2.1.25.3.3.1.2' },
        { bssid: 'AA:BB:CC:DD:EE:02', label: 'AP2', clientOid: '1.3.6.1.2.1.25.3.3.1.2' },
      ],
    };

    const poller = createSnmpPoller(transport);
    await poller.pollOnce(config);

    expect(seenOids.length).toBeGreaterThanOrEqual(1);
    const allOids = seenOids.flat();
    expect(allOids.filter((o) => o === '1.3.6.1.2.1.25.3.3.1.2').length).toBe(1);
  });
});
