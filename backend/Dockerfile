FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm run build

FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
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
