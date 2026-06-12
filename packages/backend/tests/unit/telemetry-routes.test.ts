import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { telemetryRoutes } from '../../src/routes/telemetry.js';
import { getPrisma, closePrisma } from '../../src/db/prisma.js';

describe('Telemetry Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(telemetryRoutes, { prefix: '/api/telemetry' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closePrisma();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.telemetryLog.deleteMany();
  });

  it('GET /api/telemetry returns empty array when no data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/telemetry' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('GET /api/telemetry returns stored telemetry entries', async () => {
    const prisma = getPrisma();
    await prisma.telemetryLog.create({
      data: { bssid: 'AA:BB:CC:DD:EE:01', source: 'kismet' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/telemetry' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].bssid).toBe('AA:BB:CC:DD:EE:01');
  });

  it('GET /api/telemetry/export returns CSV', async () => {
    const prisma = getPrisma();
    await prisma.telemetryLog.create({
      data: { bssid: 'AA:BB:CC:DD:EE:01', source: 'kismet' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/telemetry/export' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body).toContain('bssid');
    expect(res.body).toContain('AA:BB:CC:DD:EE:01');
  });
});
