# Etapa 1: Construcción (Build)
FROM node:20-alpine AS builder

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Generar cliente de Prisma y compilar TypeScript
RUN pnpm prisma generate
RUN pnpm build

# Etapa 2: Producción (Run)
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar solo lo necesario desde la etapa de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Exponer el puerto de la API
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["pnpm", "start"]