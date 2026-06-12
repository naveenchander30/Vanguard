import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { infrastructureRoutes } from '../../src/routes/infrastructure';

const TEST_DB_URL = 'file:./test.db';

let app: FastifyInstance;
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
  await prisma.knownInfrastructure.deleteMany();

  app = Fastify();
  await app.register(infrastructureRoutes, { prefix: '/api/infrastructure' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('GET /api/infrastructure', () => {
  beforeEach(async () => {
    await prisma.knownInfrastructure.deleteMany();
  });

  it('should return empty list when no entries exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/infrastructure',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('should return all infrastructure entries', async () => {
    await prisma.knownInfrastructure.createMany({
      data: [
        { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'AP-1' },
        { bssid: 'AA:BB:CC:DD:EE:02', ssid: 'AP-2' },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/infrastructure',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });
});

describe('POST /api/infrastructure', () => {
  beforeEach(async () => {
    await prisma.knownInfrastructure.deleteMany();
  });

  it('should create a new infrastructure entry', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/infrastructure',
      payload: {
        bssid: 'BB:CC:DD:EE:FF:11',
        ssid: 'New AP',
        label: 'Office AP',
        band: '2.4GHz',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.bssid).toBe('BB:CC:DD:EE:FF:11');
    expect(body.ssid).toBe('New AP');
    expect(body.id).toBeGreaterThan(0);
  });

  it('should return 400 for missing bssid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/infrastructure',
      payload: { ssid: 'No BSSID' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 409 for duplicate bssid', async () => {
    await prisma.knownInfrastructure.create({
      data: { bssid: 'BB:CC:DD:EE:FF:11' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/infrastructure',
      payload: { bssid: 'BB:CC:DD:EE:FF:11', ssid: 'Duplicate' },
    });

    expect(response.statusCode).toBe(409);
  });
});

describe('GET /api/infrastructure/:id', () => {
  beforeEach(async () => {
    await prisma.knownInfrastructure.deleteMany();
  });

  it('should return an entry by id', async () => {
    const created = await prisma.knownInfrastructure.create({
      data: { bssid: 'CC:DD:EE:FF:AA:01', ssid: 'Find Me' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/infrastructure/${created.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ssid).toBe('Find Me');
  });

  it('should return 404 for non-existent id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/infrastructure/99999',
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('PUT /api/infrastructure/:id', () => {
  beforeEach(async () => {
    await prisma.knownInfrastructure.deleteMany();
  });

  it('should update an existing entry', async () => {
    const created = await prisma.knownInfrastructure.create({
      data: { bssid: 'DD:EE:FF:AA:BB:01', ssid: 'Old Name' },
    });

    const response = await app.inject({
      method: 'PUT',
      url: `/api/infrastructure/${created.id}`,
      payload: { ssid: 'Updated Name', label: 'Moved' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ssid).toBe('Updated Name');
  });

  it('should return 404 for non-existent id', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/infrastructure/99999',
      payload: { ssid: 'Nope' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/infrastructure/:id', () => {
  beforeEach(async () => {
    await prisma.knownInfrastructure.deleteMany();
  });

  it('should delete an existing entry', async () => {
    const created = await prisma.knownInfrastructure.create({
      data: { bssid: 'EE:FF:AA:BB:CC:01', ssid: 'Delete Me' },
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/infrastructure/${created.id}`,
    });

    expect(response.statusCode).toBe(204);
  });

  it('should return 404 for non-existent id', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/infrastructure/99999',
    });

    expect(response.statusCode).toBe(404);
  });
});
