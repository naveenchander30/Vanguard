import type { ParsedTelemetry } from './kismet-parser.js';
import type { RouterConfig, SnmpPollResult } from './snmp-poller.js';

export interface SchedulerConfig {
  kismetIntervalMs: number;
  snmpIntervalMs: number;
  kismetPoller?: () => Promise<ParsedTelemetry[]>;
  snmpPoller?: (config: RouterConfig) => Promise<SnmpPollResult>;
  routerConfigs?: RouterConfig[];
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

  async function scheduleKismet() {
    await pollKismet();
    timers.push(setTimeout(scheduleKismet, config.kismetIntervalMs));
  }

  async function scheduleSnmp() {
    await pollSnmpRouters();
    timers.push(setTimeout(scheduleSnmp, config.snmpIntervalMs));
  }

  return {
    async start() {
      await pollKismet();
      await pollSnmpRouters();

      timers.push(setTimeout(scheduleKismet, config.kismetIntervalMs));
      timers.push(setTimeout(scheduleSnmp, config.snmpIntervalMs));
    },

    async stop() {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.length = 0;
    },
  };
}
