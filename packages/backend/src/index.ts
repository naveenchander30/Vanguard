import { buildApp } from './app.js';
import { getPrisma, closePrisma } from './db/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

async function main() {
  getPrisma();

  app = await buildApp();

  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen({ port, host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await app.close();
  await closePrisma();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await app.close();
  await closePrisma();
  process.exit(0);
});
