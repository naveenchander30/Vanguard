import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { infrastructureRoutes } from './routes/infrastructure.js';
import { scoreRoutes } from './routes/scores.js';
import { telemetryRoutes } from './routes/telemetry.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
  });

  await app.register(infrastructureRoutes, { prefix: '/api/infrastructure' });
  await app.register(scoreRoutes, { prefix: '/api/scores' });
  await app.register(telemetryRoutes, { prefix: '/api/telemetry' });

  return app;
}
