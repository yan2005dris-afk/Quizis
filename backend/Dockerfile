# ─── Stage 1: Base ─────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Stage 2: Dependencies ─────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++
# Copy workspace manifests from monorepo root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter backend...

# ─── Stage 3: Builder ──────────────────────────────────────────
FROM deps AS builder
COPY backend ./backend
RUN pnpm --filter backend run prisma:generate
RUN pnpm --filter backend run build

# ─── Stage 4: Production ───────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter backend... --prod

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/src/generated ./backend/src/generated

EXPOSE ${PORT:-3000}
CMD ["node", "backend/dist/main.js"]