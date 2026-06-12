export interface KismetDevice {
  'kismet.device.base.type'?: string;
  'kismet.device.base.macaddr'?: string;
  'kismet.device.base.channel'?: string;
  'kismet.device.base.frequency'?: number;
  'kismet.device.base.name'?: string;
  'kismet.device.base.commonname'?: string;
  'kismet.device.base.signal'?: {
    'kismet.common.signal.last_signal'?: number;
    'kismet.common.signal.min_signal'?: number;
    'kismet.common.signal.max_signal'?: number;
  };
  'kismet.device.base.packets.tx_total'?: number;
  'kismet.device.base.packets.rx_total'?: number;
  'dot11.device'?: {
    'dot11.device.last_beaconed_ssid_record'?: {
      'dot11.advertisedssid.ssid'?: string;
      'dot11.advertisedssid.channel'?: string;
      'dot11.advertisedssid.dot11e_channel_utilization_perc'?: number;
      'dot11.advertisedssid.dot11e_qbss_stations'?: number;
    };
  };
}

export interface ParsedTelemetry {
  bssid: string;
  ssid: string;
  band: string;
  channel: string;
  frequency?: number;
  signalDb?: number;
  minSignalDb?: number;
  maxSignalDb?: number;
  channelUtilization?: number;
  clientCount?: number;
  txPackets?: number;
  rxPackets?: number;
  source: string;
}

function frequencyBand(freqKHz: number): string {
  if (freqKHz >= 5925000) return '6GHz';
  if (freqKHz >= 4900000) return '5GHz';
  if (freqKHz >= 2400000) return '2.4GHz';
  return 'unknown';
}

export function parseKismetDevices(devices: KismetDevice[]): ParsedTelemetry[] {
  return devices
    .filter((d) => d['kismet.device.base.type'] === 'Wi-Fi AP')
    .map((device) => {
      const bssid = device['kismet.device.base.macaddr'] || '';
      const channel = device['kismet.device.base.channel'] || '';
      const frequency = device['kismet.device.base.frequency'];
      const signal = device['kismet.device.base.signal'];
      const dot11 = device['dot11.device'];
      const beaconed = dot11?.['dot11.device.last_beaconed_ssid_record'];
      const advertisedSsid = beaconed?.['dot11.advertisedssid.ssid'];
      const deviceName = device['kismet.device.base.name'];

      const ssid = advertisedSsid || deviceName || '';

      return {
        bssid,
        ssid,
        band: frequency ? frequencyBand(frequency) : 'unknown',
        channel,
        frequency: frequency || undefined,
        signalDb: signal?.['kismet.common.signal.last_signal'],
        minSignalDb: signal?.['kismet.common.signal.min_signal'],
        maxSignalDb: signal?.['kismet.common.signal.max_signal'],
        channelUtilization: beaconed?.['dot11.advertisedssid.dot11e_channel_utilization_perc'],
        clientCount: beaconed?.['dot11.advertisedssid.dot11e_qbss_stations'],
        txPackets: device['kismet.device.base.packets.tx_total'],
        rxPackets: device['kismet.device.base.packets.rx_total'],
        source: 'kismet',
      };
    });
}
