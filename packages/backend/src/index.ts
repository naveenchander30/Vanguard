import { buildApp } from './app.js';
import { getPrisma, closePrisma } from './db/prisma.js';
import { createSnmpSession } from './services/snmp-transport.js';
import { createPollingScheduler } from './services/polling-scheduler.js';
import { createKismetPoller } from './services/kismet-poller.js';
import { pollClientLoads } from './services/hybrid-client-poller.js';
import { computeScoresFromTelemetry } from './services/compute-scores.js';
import { storeTelemetry } from './services/store-telemetry.js';
import type { FastifyInstance } from 'fastify';
import type { ParsedTelemetry } from './services/kismet-parser.js';

let app: FastifyInstance;
let scheduler: ReturnType<typeof createPollingScheduler>;

async function main() {
  const prisma = getPrisma();

  app = await buildApp();

  const kismetUrl = process.env.KISMET_URL || 'http://localhost:2501';

  const kismetPoller = createKismetPoller(kismetUrl);

  scheduler = createPollingScheduler({
    kismetIntervalMs: 30_000,
    snmpIntervalMs: 60_000,
    hybridIntervalMs: 15_000,
    kismetPoller,
    routerConfigs: [],
    hybridPoller: async () => {
      const aps = await prisma.knownInfrastructure.findMany();
      const reports = await pollClientLoads(
        aps.map((ap) => ({
          bssid: ap.bssid,
          label: ap.label || ap.ssid || '',
          ipAddress: ap.ipAddress,
          supportsSnmp: ap.supportsSnmp,
          snmpOid: ap.snmpOid,
          snmpCommunity: ap.snmpCommunity,
        })),
        { kismetUrl, createSnmpTransport: createSnmpSession },
      );
      return reports.map((r) => ({
        bssid: r.bssid,
        name: r.name,
        activeClientCount: r.activeClientCount,
        source: r.source,
      }));
    },
    storeTelemetry: async (entries: ParsedTelemetry[]) => {
      await storeTelemetry(entries);
      await computeScoresFromTelemetry(entries);
    },
  });

  await scheduler.start();

  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen({ port, host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await scheduler.stop();
  await app.close();
  await closePrisma();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await scheduler.stop();
  await app.close();
  await closePrisma();
  process.exit(0);
});
