import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { infrastructureRoutes } from './routes/infrastructure.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
  });

  await app.register(infrastructureRoutes, { prefix: '/api/infrastructure' });

  return app;
}
