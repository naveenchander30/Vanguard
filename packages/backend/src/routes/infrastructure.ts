import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../db/prisma.js';
import { z } from 'zod';

const createSchema = z.object({
  bssid: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'Invalid MAC address format'),
  ssid: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  band: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateSchema = z.object({
  ssid: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  band: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function infrastructureRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();
    const entries = await prisma.knownInfrastructure.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(entries);
  });

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const prisma = getPrisma();
    try {
      const entry = await prisma.knownInfrastructure.create({
        data: parsed.data,
      });
      return reply.status(201).send(entry);
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.status(409).send({ error: 'BSSID already exists' });
      }
      throw err;
    }
  });

  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const intId = parseInt(id, 10);
    if (isNaN(intId)) return reply.status(400).send({ error: 'Invalid id parameter' });
    const prisma = getPrisma();
    const entry = await prisma.knownInfrastructure.findUnique({
      where: { id: intId },
    });

    if (!entry) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.send(entry);
  });

  app.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const intId = parseInt(id, 10);
    if (isNaN(intId)) return reply.status(400).send({ error: 'Invalid id parameter' });
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const prisma = getPrisma();
    try {
      const entry = await prisma.knownInfrastructure.update({
        where: { id: intId },
        data: parsed.data,
      });
      return reply.send(entry);
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.status(404).send({ error: 'Not found' });
      }
      throw err;
    }
  });

  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const intId = parseInt(id, 10);
    if (isNaN(intId)) return reply.status(400).send({ error: 'Invalid id parameter' });
    const prisma = getPrisma();
    try {
      await prisma.knownInfrastructure.delete({
        where: { id: intId },
      });
      return reply.status(204).send();
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.status(404).send({ error: 'Not found' });
      }
      throw err;
    }
  });
}
