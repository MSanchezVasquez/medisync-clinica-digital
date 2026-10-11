FROM node:24-alpine AS base

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Etapa de desarrollo (usada por docker compose con bind mount)
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "run", "dev"]

# Etapa de compilación para producción
FROM dev AS builder
RUN pnpm run build

# Etapa final de producción con Nginx
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
