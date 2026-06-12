import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { getPrisma } from '../../src/db/prisma.js';
import type { FastifyInstance } from 'fastify';

describe('Client Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.telemetryLog.deleteMany();
  });

  it('GET /api/clients returns empty array when no telemetry with clients', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/clients',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('GET /api/clients returns client data from telemetry logs', async () => {
    const prisma = getPrisma();
    await prisma.telemetryLog.create({
      data: {
        bssid: 'AA:BB:CC:DD:EE:01',
        ssid: 'AP-One',
        band: '5GHz',
        channel: '36',
        clientCount: 5,
        source: 'kismet',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/clients',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      bssid: 'AA:BB:CC:DD:EE:01',
      ssid: 'AP-One',
      activeClientCount: 5,
      source: 'kismet',
    });
    expect(body[0]).toHaveProperty('lastSeen');
  });

  it('GET /api/clients returns latest entry per BSSID', async () => {
    const prisma = getPrisma();
    await prisma.telemetryLog.create({
      data: { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'AP-One', band: '5GHz', channel: '36', clientCount: 3, source: 'kismet' },
    });
    await prisma.telemetryLog.create({
      data: { bssid: 'AA:BB:CC:DD:EE:02', ssid: 'AP-Two', band: '2.4GHz', channel: '6', clientCount: 10, source: 'snmp' },
    });
    await prisma.telemetryLog.create({
      data: { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'AP-One', band: '5GHz', channel: '36', clientCount: 7, source: 'kismet' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/clients',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);

    const ap1 = body.find((b: Record<string, unknown>) => b.bssid === 'AA:BB:CC:DD:EE:01');
    const ap2 = body.find((b: Record<string, unknown>) => b.bssid === 'AA:BB:CC:DD:EE:02');
    expect(ap1.activeClientCount).toBe(7);
    expect(ap2.activeClientCount).toBe(10);
  });
});
