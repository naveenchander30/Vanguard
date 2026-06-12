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

  app.delete('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();
    await prisma.telemetryLog.deleteMany();
    return reply.status(204).send();
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

    function escapeCsv(val: unknown): string {
      if (val == null) return '';
      const str = String(val);
      const sanitized = /^[=+\-@]/.test(str) ? `'${str}` : str;
      if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
        return `"${sanitized.replace(/"/g, '""')}"`;
      }
      return sanitized;
    }

    for (const e of entries) {
      const row = headers.map((h) => escapeCsv((e as Record<string, unknown>)[h]));
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="telemetry-export.csv"');
    return reply.send(csv);
  });
}
