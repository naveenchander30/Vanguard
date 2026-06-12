import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrisma } from '../db/prisma.js';

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();

    const logs = await prisma.telemetryLog.findMany({
      where: {
        clientCount: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const latest = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      if (!latest.has(log.bssid)) {
        latest.set(log.bssid, log);
      }
    }

    return reply.send(
      Array.from(latest.entries()).map(([bssid, log]) => ({
        bssid,
        ssid: log.ssid,
        activeClientCount: log.clientCount ?? 0,
        source: log.source,
        lastSeen: log.createdAt,
      })),
    );
  });

  app.get('/stream', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const prisma = getPrisma();

    let closed = false;
    let polling = false;

    async function poll() {
      if (polling || closed) return;
      polling = true;
      try {
        const logs = await prisma.telemetryLog.findMany({
          where: {
            clientCount: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });

        const latest = new Map<string, typeof logs[0]>();
        for (const log of logs) {
          if (!latest.has(log.bssid)) {
            latest.set(log.bssid, log);
          }
        }

        const data = Array.from(latest.entries()).map(([bssid, log]) => ({
          bssid,
          ssid: log.ssid,
          activeClientCount: log.clientCount ?? 0,
          source: log.source,
          lastSeen: log.createdAt,
        }));

        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        reply.raw.write(`data: []\n\n`);
      } finally {
        polling = false;
        if (!closed) setTimeout(poll, 5000);
      }
    }

    await poll();

    _request.raw.on('close', () => {
      closed = true;
    });
  });
}
