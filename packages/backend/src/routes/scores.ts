import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrisma } from '../db/prisma.js';

export async function scoreRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();
    const scores = await prisma.congestionScore.findMany({
      orderBy: [{ channel: 'asc' }, { band: 'asc' }],
      take: 100,
    });
    return reply.send(scores);
  });

  app.get('/stream', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const prisma = getPrisma();

    const sendScores = async () => {
      try {
        const scores = await prisma.congestionScore.findMany({
          orderBy: [{ channel: 'asc' }, { band: 'asc' }],
          take: 100,
        });
        reply.raw.write(`data: ${JSON.stringify(scores)}\n\n`);
      } catch {
        reply.raw.write(`data: []\n\n`);
      }
    };

    await sendScores();

    const interval = setInterval(sendScores, 5000);

    _request.raw.on('close', () => {
      clearInterval(interval);
    });
  });
}
