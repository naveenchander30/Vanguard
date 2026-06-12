import { describe, it, expect } from 'vitest';
import { parseKismetDevices } from '../../src/services/kismet-parser.js';

describe('Kismet Parser', () => {
  it('should return empty array for empty input', () => {
    const result = parseKismetDevices([]);
    expect(result).toEqual([]);
  });

  it('should filter non-AP devices', () => {
    const devices = [
      {
        'kismet.device.base.type': 'Wi-Fi Client',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:01',
      },
    ];
    const result = parseKismetDevices(devices);
    expect(result).toHaveLength(0);
  });

  it('should extract bssid and signal from a Wi-Fi AP device', () => {
    const devices = [
      {
        'kismet.device.base.type': 'Wi-Fi AP',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
        'kismet.device.base.channel': '11',
        'kismet.device.base.frequency': 2462000,
        'kismet.device.base.signal': {
          'kismet.common.signal.last_signal': -65,
          'kismet.common.signal.min_signal': -72,
          'kismet.common.signal.max_signal': -60,
          'kismet.common.signal.type': 'dbm',
        },
        'kismet.device.base.packets.tx_total': 100,
        'kismet.device.base.packets.rx_total': 200,
      },
    ];
    const result = parseKismetDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0].bssid).toBe('AA:BB:CC:DD:EE:FF');
    expect(result[0].signalDb).toBe(-65);
    expect(result[0].minSignalDb).toBe(-72);
    expect(result[0].maxSignalDb).toBe(-60);
  });

  it('should extract SSID from beaconed ssid record', () => {
    const devices = [
      {
        'kismet.device.base.type': 'Wi-Fi AP',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
        'kismet.device.base.channel': '1',
        'dot11.device': {
          'dot11.device.last_beaconed_ssid_record': {
            'dot11.advertisedssid.ssid': 'OfficeWiFi',
            'dot11.advertisedssid.channel': '1',
            'dot11.advertisedssid.dot11e_channel_utilization_perc': 25.5,
            'dot11.advertisedssid.dot11e_qbss_stations': 5,
          },
        },
      },
    ];
    const result = parseKismetDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0].ssid).toBe('OfficeWiFi');
    expect(result[0].channelUtilization).toBe(25.5);
    expect(result[0].clientCount).toBe(5);
  });

  it('should derive band from frequency', () => {
    const makeAp = (freq: number, channel: string) => ({
      'kismet.device.base.type': 'Wi-Fi AP',
      'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
      'kismet.device.base.channel': channel,
      'kismet.device.base.frequency': freq,
    });

    expect(parseKismetDevices([makeAp(2412000, '1')])[0].band).toBe('2.4GHz');
    expect(parseKismetDevices([makeAp(5180000, '36')])[0].band).toBe('5GHz');
    expect(parseKismetDevices([makeAp(0, '')])[0].band).toBe('unknown');
  });

  it('should populate all TelemetryLog-compatible fields for a complete AP device', () => {
    const devices = [
      {
        'kismet.device.base.type': 'Wi-Fi AP',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
        'kismet.device.base.channel': '149',
        'kismet.device.base.frequency': 5745000,
        'kismet.device.base.signal': {
          'kismet.common.signal.last_signal': -58,
          'kismet.common.signal.min_signal': -70,
          'kismet.common.signal.max_signal': -50,
        },
        'kismet.device.base.packets.tx_total': 500,
        'kismet.device.base.packets.rx_total': 1500,
        'kismet.device.base.name': 'Corp-5G',
        'dot11.device': {
          'dot11.device.last_beaconed_ssid_record': {
            'dot11.advertisedssid.ssid': 'Corp-5G',
            'dot11.advertisedssid.channel': '149',
            'dot11.advertisedssid.dot11e_channel_utilization_perc': 40.0,
            'dot11.advertisedssid.dot11e_qbss_stations': 12,
          },
        },
      },
    ];

    const result = parseKismetDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      bssid: 'AA:BB:CC:DD:EE:FF',
      ssid: 'Corp-5G',
      band: '5GHz',
      channel: '149',
      frequency: 5745000,
      signalDb: -58,
      minSignalDb: -70,
      maxSignalDb: -50,
      channelUtilization: 40.0,
      clientCount: 12,
      txPackets: 500,
      rxPackets: 1500,
      source: 'kismet',
    });
  });

  it('should handle device with no signal data', () => {
    const devices = [
      {
        'kismet.device.base.type': 'Wi-Fi AP',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
      },
    ];
    const result = parseKismetDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0].bssid).toBe('AA:BB:CC:DD:EE:FF');
    expect(result[0].signalDb).toBeUndefined();
  });

  it('should handle mixed device types', () => {
    const devices = [
      { 'kismet.device.base.type': 'Wi-Fi AP', 'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:01' },
      { 'kismet.device.base.type': 'Wi-Fi Client', 'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:02' },
      { 'kismet.device.base.type': 'Wi-Fi Bridge', 'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:03' },
      { 'kismet.device.base.type': 'Wi-Fi AP', 'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:04' },
    ];
    const result = parseKismetDevices(devices);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.bssid).sort()).toEqual([
      'AA:BB:CC:DD:EE:01',
      'AA:BB:CC:DD:EE:04',
    ]);
  });

  it('should fallback to commonname when name is empty', () => {
    const devices = [
      {
        'kismet.device.base.type': 'Wi-Fi AP',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
        'kismet.device.base.name': '',
        'kismet.device.base.commonname': 'AA:BB:CC:DD:EE:FF',
      },
    ];
    const result = parseKismetDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0].ssid).toBe('');
  });
});
