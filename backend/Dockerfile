FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://postgres:rootadmin@medisync-db:5432/medisync"
RUN pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

RUN mkdir -p /app/data
EXPOSE 3000

CMD ["pnpm", "start"]
