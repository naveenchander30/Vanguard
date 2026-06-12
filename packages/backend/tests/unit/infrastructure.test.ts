import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const TEST_DB_URL = 'file:./test.db';

function getDb(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
}

describe('KnownInfrastructure Service', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = getDb();
    await prisma.knownInfrastructure.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should create a known infrastructure entry', async () => {
    const entry = await prisma.knownInfrastructure.create({
      data: {
        bssid: 'AA:BB:CC:DD:EE:FF',
        ssid: 'Qualian Mesh',
        label: 'Main Office AP',
        band: '5GHz',
        notes: 'Primary mesh node',
      },
    });

    expect(entry.id).toBeGreaterThan(0);
    expect(entry.bssid).toBe('AA:BB:CC:DD:EE:FF');
    expect(entry.ssid).toBe('Qualian Mesh');
    expect(entry.label).toBe('Main Office AP');
    expect(entry.band).toBe('5GHz');
    expect(entry.notes).toBe('Primary mesh node');
  });

  it('should enforce unique bssid constraint', async () => {
    await prisma.knownInfrastructure.create({
      data: { bssid: 'AA:BB:CC:DD:EE:FF' },
    });

    await expect(
      prisma.knownInfrastructure.create({
        data: { bssid: 'AA:BB:CC:DD:EE:FF' },
      })
    ).rejects.toThrow();
  });

  it('should list all infrastructure entries', async () => {
    await prisma.knownInfrastructure.createMany({
      data: [
        { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'AP-1' },
        { bssid: 'AA:BB:CC:DD:EE:02', ssid: 'AP-2' },
        { bssid: 'AA:BB:CC:DD:EE:03', ssid: 'AP-3' },
      ],
    });

    const entries = await prisma.knownInfrastructure.findMany();

    expect(entries).toHaveLength(3);
  });

  it('should get an entry by bssid', async () => {
    await prisma.knownInfrastructure.create({
      data: { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Test AP' },
    });

    const entry = await prisma.knownInfrastructure.findUnique({
      where: { bssid: 'AA:BB:CC:DD:EE:FF' },
    });

    expect(entry).not.toBeNull();
    expect(entry!.ssid).toBe('Test AP');
    expect(entry!.id).toBeGreaterThan(0);
  });

  it('should update an entry by id', async () => {
    const created = await prisma.knownInfrastructure.create({
      data: { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Old Name' },
    });

    const updated = await prisma.knownInfrastructure.update({
      where: { id: created.id },
      data: { ssid: 'Updated Name', label: 'Moved to new location' },
    });

    expect(updated.ssid).toBe('Updated Name');
    expect(updated.label).toBe('Moved to new location');
  });

  it('should delete an entry by id', async () => {
    const created = await prisma.knownInfrastructure.create({
      data: { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'To Delete' },
    });

    await prisma.knownInfrastructure.delete({ where: { id: created.id } });

    const found = await prisma.knownInfrastructure.findUnique({
      where: { id: created.id },
    });

    expect(found).toBeNull();
  });

  it('should return empty list when no entries exist', async () => {
    const entries = await prisma.knownInfrastructure.findMany();
    expect(entries).toHaveLength(0);
  });

  it('should allow partial creation with only bssid', async () => {
    const entry = await prisma.knownInfrastructure.create({
      data: { bssid: 'AA:BB:CC:DD:EE:FF' },
    });

    expect(entry.id).toBeGreaterThan(0);
    expect(entry.bssid).toBe('AA:BB:CC:DD:EE:FF');
    expect(entry.ssid).toBeNull();
    expect(entry.label).toBeNull();
  });

  it('should update updatedAt timestamp on update', async () => {
    const created = await prisma.knownInfrastructure.create({
      data: { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Original' },
    });

    await new Promise((r) => setTimeout(r, 100));

    const updated = await prisma.knownInfrastructure.update({
      where: { id: created.id },
      data: { ssid: 'Changed' },
    });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });
});
