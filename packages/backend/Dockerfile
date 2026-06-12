FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/prisma/ ./packages/backend/prisma/

RUN pnpm install --frozen-lockfile

COPY packages/backend/ ./packages/backend/
RUN pnpm --filter @spectrum/backend run build

FROM node:22-alpine
WORKDIR /app

RUN corepack enable

COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/prisma ./prisma
COPY --from=builder /app/packages/backend/package.json ./package.json
COPY --from=builder /app/packages/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules ./node_modules

RUN pnpm --filter @spectrum/backend prisma generate

EXPOSE 3000
CMD ["node", "dist/index.js"]
