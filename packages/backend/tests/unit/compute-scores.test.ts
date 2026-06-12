import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { getPrisma } from '../../src/db/prisma.js';
import { computeScoresFromTelemetry } from '../../src/services/compute-scores.js';
import type { FastifyInstance } from 'fastify';
import type { ParsedTelemetry } from '../../src/services/kismet-parser.js';

describe('computeScoresFromTelemetry', () => {
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
    await prisma.congestionScore.deleteMany();
    await prisma.knownInfrastructure.deleteMany();
  });

  it('should persist scores to the database', async () => {
    const prisma = getPrisma();
    await prisma.knownInfrastructure.create({
      data: { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'Known AP', label: 'Known AP' },
    });

    const entries: ParsedTelemetry[] = [
      { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'Known AP', band: '5GHz', channel: '36', signalDb: -50, clientCount: 3, source: 'kismet' },
      { bssid: 'BB:CC:DD:EE:FF:01', ssid: 'Unknown AP', band: '5GHz', channel: '36', signalDb: -55, source: 'kismet' },
    ];

    const scores = await computeScoresFromTelemetry(entries);

    expect(scores.length).toBeGreaterThan(0);

    const saved = await prisma.congestionScore.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    expect(saved.length).toBeGreaterThanOrEqual(scores.length);
  });
});
