import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';

const TEST_DB_URL = 'file:./test.db';

let prisma: PrismaClient;

beforeAll(() => {
  process.env.DATABASE_URL = TEST_DB_URL;
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    cwd: __dirname + '/..',
  });
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
  }
  return prisma;
}
