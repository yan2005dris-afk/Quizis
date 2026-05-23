# ─── Stage 1: Base ─────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
# Configuramos pnpm para que no bloquee los builds por scripts de dependencias (pnpm 10+)
RUN pnpm config set only-built-dependencies-file .pnpm-debug.log || true

# ─── Stage 2: Dependencies ─────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++
# Copiamos solo los archivos necesarios del backend
COPY package.json pnpm-lock.yaml* ./
# Instalamos dependencias (sin requerir el workspace de la raíz)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# ─── Stage 3: Builder ──────────────────────────────────────────
FROM deps AS builder
ENV NODE_ENV=production
COPY . .
# Limpiamos posibles artefactos locales previos y generamos Prisma
RUN rm -rf src/generated && pnpm exec prisma generate
RUN pnpm run build

# ─── Stage 4: Production ───────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml* ./
# Instalamos solo dependencias de producción e ignoramos scripts
RUN pnpm install --prod --no-frozen-lockfile --ignore-scripts

# Copiamos los artefactos generados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma

EXPOSE ${PORT:-3000}
CMD ["node", "dist/src/main.js"]
