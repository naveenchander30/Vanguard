import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrisma } from '../db/prisma.js';

export async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();
    const entries = await prisma.telemetryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return reply.send(entries);
  });

  app.get('/export', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();
    const entries = await prisma.telemetryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const headers = [
      'id', 'bssid', 'ssid', 'band', 'channel', 'frequency',
      'signalDb', 'minSignalDb', 'maxSignalDb', 'clientCount',
      'channelUtilization', 'noiseFloor', 'retryRate',
      'source', 'createdAt',
    ];

    const csvRows: string[] = [headers.join(',')];

    for (const e of entries) {
      const row = headers.map((h) => {
        const val = (e as Record<string, unknown>)[h];
        if (val == null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="telemetry-export.csv"');
    return reply.send(csv);
  });
}
