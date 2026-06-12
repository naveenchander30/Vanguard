import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { scoreRoutes } from '../../src/routes/scores.js';
import { getPrisma, closePrisma } from '../../src/db/prisma.js';

describe('Score Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scoreRoutes, { prefix: '/api/scores' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closePrisma();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.congestionScore.deleteMany();
  });

  it('GET /api/scores returns empty array when no scores exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scores' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('GET /api/scores returns stored scores', async () => {
    const prisma = getPrisma();
    await prisma.congestionScore.create({
      data: { channel: 36, band: '5GHz', score: 25, breakdown: '{}' },
    });
    await prisma.congestionScore.create({
      data: { channel: 1, band: '2.4GHz', score: 70, breakdown: '{}' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/scores' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
  });
});
