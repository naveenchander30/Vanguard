import type { ParsedTelemetry } from './kismet-parser.js';

export interface SnmpVarbind {
  oid: string;
  value: number | string | undefined;
}

export interface SnmpTransport {
  get(oids: string[]): Promise<SnmpVarbind[]>;
  close(): Promise<void>;
}

export interface BssidMapping {
  bssid: string;
  label: string;
  band?: string;
  channel?: string;
  clientOid?: string;
  utilizationOid?: string;
  noiseOid?: string;
}

export interface RouterConfig {
  host: string;
  community: string;
  oids?: Record<string, string>;
  bssidMappings: BssidMapping[];
}

export interface SnmpPollResult {
  hostname: string;
  telemetry: ParsedTelemetry[];
}

export function createSnmpPoller(transport: SnmpTransport) {
  async function pollOnce(config: RouterConfig): Promise<SnmpPollResult> {
    const oidsToQuery = new Set<string>();

    if (config.oids) {
      for (const oid of Object.values(config.oids)) {
        oidsToQuery.add(oid);
      }
    }

    const mappings = config.bssidMappings || [];

    for (const mapping of mappings) {
      if (mapping.clientOid) oidsToQuery.add(mapping.clientOid);
      if (mapping.utilizationOid) oidsToQuery.add(mapping.utilizationOid);
      if (mapping.noiseOid) oidsToQuery.add(mapping.noiseOid);
    }

    const results = await transport.get([...oidsToQuery]);
    const valueMap = new Map<string, number | string | undefined>();
    for (const v of results) {
      valueMap.set(v.oid, v.value);
    }

    const telemetry: ParsedTelemetry[] = mappings.map((mapping) => {
      const entry: ParsedTelemetry = {
        bssid: mapping.bssid,
        ssid: mapping.label,
        band: mapping.band || 'unknown',
        channel: mapping.channel || '',
        source: 'snmp',
      };

      if (mapping.clientOid) {
        const val = valueMap.get(mapping.clientOid);
        if (typeof val === 'number') {
          entry.clientCount = val;
        }
      }

      if (mapping.utilizationOid) {
        const val = valueMap.get(mapping.utilizationOid);
        if (typeof val === 'number') {
          entry.channelUtilization = val;
        }
      }

      if (mapping.noiseOid) {
        const val = valueMap.get(mapping.noiseOid);
        if (typeof val === 'number') {
          entry.noiseFloor = val;
        }
      }

      return entry;
    });

    return {
      hostname: config.host,
      telemetry,
    };
  }

  return { pollOnce };
}
