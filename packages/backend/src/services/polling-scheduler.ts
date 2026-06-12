import type { ParsedTelemetry } from './kismet-parser.js';
import type { RouterConfig, SnmpPollResult } from './snmp-poller.js';

export interface ClientLoadReport {
  bssid: string;
  name: string;
  activeClientCount: number;
  source: 'snmp' | 'kismet';
}

export interface SchedulerConfig {
  kismetIntervalMs: number;
  snmpIntervalMs: number;
  hybridIntervalMs?: number;
  kismetPoller?: () => Promise<ParsedTelemetry[]>;
  snmpPoller?: (config: RouterConfig) => Promise<SnmpPollResult>;
  routerConfigs?: RouterConfig[];
  hybridPoller?: () => Promise<ClientLoadReport[]>;
  storeTelemetry: (entries: ParsedTelemetry[]) => Promise<void>;
}

export interface PollingScheduler {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createPollingScheduler(config: SchedulerConfig): PollingScheduler {
  const timers: ReturnType<typeof setTimeout>[] = [];

  async function pollKismet(): Promise<void> {
    if (!config.kismetPoller) return;
    try {
      const entries = await config.kismetPoller();
      if (entries.length > 0) {
        await config.storeTelemetry(entries);
      }
    } catch (err) {
      console.error('Kismet poll failed:', err);
    }
  }

  async function pollSnmpRouters(): Promise<void> {
    if (!config.snmpPoller || !config.routerConfigs) return;
    for (const routerConfig of config.routerConfigs) {
      try {
        const result = await config.snmpPoller(routerConfig);
        if (result.telemetry.length > 0) {
          await config.storeTelemetry(result.telemetry);
        }
      } catch (err) {
        console.error(`SNMP poll failed for ${routerConfig.host}:`, err);
      }
    }
  }

  async function pollHybrid(): Promise<void> {
    if (!config.hybridPoller) return;
    try {
      const reports = await config.hybridPoller();
      const telemetry: ParsedTelemetry[] = reports.map((r) => ({
        bssid: r.bssid,
        ssid: r.name,
        band: '',
        channel: '',
        clientCount: r.activeClientCount,
        source: r.source,
      }));
      if (telemetry.length > 0) {
        await config.storeTelemetry(telemetry);
      }
    } catch (err) {
      console.error('Hybrid client poll failed:', err);
    }
  }

  async function scheduleKismet() {
    await pollKismet();
    timers.push(setTimeout(scheduleKismet, config.kismetIntervalMs));
  }

  async function scheduleSnmp() {
    await pollSnmpRouters();
    timers.push(setTimeout(scheduleSnmp, config.snmpIntervalMs));
  }

  async function scheduleHybrid() {
    await pollHybrid();
    timers.push(setTimeout(scheduleHybrid, config.hybridIntervalMs || 15000));
  }

  return {
    async start() {
      await pollKismet();
      await pollSnmpRouters();
      await pollHybrid();

      timers.push(setTimeout(scheduleKismet, config.kismetIntervalMs));
      timers.push(setTimeout(scheduleSnmp, config.snmpIntervalMs));
      if (config.hybridPoller) {
        timers.push(setTimeout(scheduleHybrid, config.hybridIntervalMs || 15000));
      }
    },

    async stop() {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.length = 0;
    },
  };
}
