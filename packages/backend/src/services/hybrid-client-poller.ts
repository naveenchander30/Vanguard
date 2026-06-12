import type { KismetDevice } from './kismet-parser.js';
import type { SnmpTransport } from './snmp-poller.js';
import { fetchKismetDevices } from './kismet-client.js';

const ACTIVE_WINDOW_MS = 60_000;

export interface ClientLoadReport {
  bssid: string;
  name: string;
  activeClientCount: number;
  source: 'snmp' | 'kismet';
  clients: ConnectedClient[];
}

export interface ConnectedClient {
  mac: string;
  name: string;
  signalDb: number | null;
  lastSeen: Date;
}

export interface ApConfig {
  bssid: string;
  label: string;
  ipAddress: string | null;
  supportsSnmp: boolean;
  snmpOid: string | null;
  snmpCommunity: string | null;
}

function isClientDevice(device: KismetDevice): boolean {
  return device['kismet.device.base.type'] === 'Wi-Fi Client';
}

function getLastBssid(device: KismetDevice): string | null {
  const dot11 = device['dot11.device'];
  const association = dot11?.['dot11.device.last_bssid' as keyof typeof dot11];
  const lastBssid = dot11?.['kismet.device.base.macaddr' as keyof typeof dot11] as string | undefined;
  return (association as string) || lastBssid || null;
}

function getLastTime(device: KismetDevice): number | null {
  return (device['kismet.device.base.last_time' as keyof KismetDevice] as number) || null;
}

function getSignal(device: KismetDevice): number | null {
  return device['kismet.device.base.signal']?.['kismet.common.signal.last_signal'] ?? null;
}

function getClientName(device: KismetDevice): string {
  const dot11 = device['dot11.device'];
  const probe = dot11?.['dot11.device.probed_ssid' as keyof typeof dot11];
  return (probe as string) || device['kismet.device.base.commonname'] || device['kismet.device.base.macaddr'] || '';
}

function getAssociatedClients(
  devices: KismetDevice[],
  bssid: string,
): ConnectedClient[] {
  const now = Date.now() / 1000;

  return devices
    .filter((d) => {
      if (!isClientDevice(d)) return false;
      if (getLastBssid(d) !== bssid) return false;
      const lastTime = getLastTime(d);
      if (lastTime == null) return false;
      return (now - lastTime) * 1000 <= ACTIVE_WINDOW_MS;
    })
    .map((d) => ({
      mac: d['kismet.device.base.macaddr'] || '',
      name: getClientName(d),
      signalDb: getSignal(d),
      lastSeen: new Date((getLastTime(d) || 0) * 1000),
    }));
}

export async function pollClientLoads(
  aps: ApConfig[],
  options: {
    kismetUrl: string;
    createSnmpTransport?: (host: string, community: string) => SnmpTransport;
  },
): Promise<ClientLoadReport[]> {
  const needsKismet = aps.some((ap) => !ap.supportsSnmp || ap.snmpOid == null);
  let allDevices: KismetDevice[] = [];

  if (needsKismet) {
    try {
      allDevices = await fetchKismetDevices(options.kismetUrl);
    } catch (err) {
      console.error('Failed to fetch Kismet devices:', err);
    }
  }

  const results: ClientLoadReport[] = [];

  for (const ap of aps) {
    if (ap.supportsSnmp && ap.snmpOid && ap.ipAddress && options.createSnmpTransport) {
      const transport = options.createSnmpTransport(ap.ipAddress, ap.snmpCommunity || 'public');
      try {
        const varbinds = await transport.get([ap.snmpOid]);
        const val = varbinds.find((v) => v.oid === ap.snmpOid)?.value;
        if (typeof val === 'number') {
          results.push({
            bssid: ap.bssid,
            name: ap.label,
            activeClientCount: val,
            source: 'snmp',
            clients: [],
          });
          await transport.close();
          continue;
        }
        await transport.close();
      } catch (err) {
        await transport.close();
        console.error(`SNMP poll failed for ${ap.label}, falling back to Kismet:`, err);
      }
    }

    const clients = getAssociatedClients(allDevices, ap.bssid);

    results.push({
      bssid: ap.bssid,
      name: ap.label,
      activeClientCount: clients.length,
      source: 'kismet',
      clients,
    });
  }

  return results;
}
