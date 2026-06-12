import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
    const url = dbUrl.includes('?') ? dbUrl : `${dbUrl}?journal_mode=WAL`;
    prisma = new PrismaClient({ datasources: { db: { url } } });
  }
  return prisma;
}

export async function closePrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
