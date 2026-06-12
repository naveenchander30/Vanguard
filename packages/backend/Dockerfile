FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/prisma/ ./packages/backend/prisma/

RUN pnpm install --frozen-lockfile

COPY packages/backend/ ./packages/backend/
RUN pnpm --filter @spectrum/backend exec prisma generate
RUN pnpm --filter @spectrum/backend run build

FROM node:22-alpine
RUN corepack enable

COPY --from=builder /app /app
WORKDIR /app/packages/backend

EXPOSE 3001
CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss && node dist/index.js"]
