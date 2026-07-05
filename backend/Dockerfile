# syntax=docker/dockerfile:1

# =============================================================================
# Backend Dockerfile — NestJS + Prisma
# Build context: project root (.)
# Cache strategy: BuildKit cache mount on /pnpm/store so pnpm does not
# re-download the world on every build.
# =============================================================================

# Stage 1: Base image with pnpm setup
# -------------------------------------------------------------------------
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

WORKDIR /app

# Stage 2: Install dependencies (cache mount persists pnpm store between builds)
# -------------------------------------------------------------------------
FROM base AS deps

# Copy only the manifests first — invalidates this layer only when they change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY backend/package.json ./backend/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 3: Build the application
# -------------------------------------------------------------------------
FROM base AS build

# Pull in the resolved node_modules from deps.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy workspace config + backend source.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/ ./backend/

# Generate Prisma client + compile NestJS.
# Reuses the same /pnpm/store cache so the install is essentially free.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter backend exec prisma generate && \
    pnpm --filter backend run build

# Stage 4: Production pruned dependencies (selective copy, not the full /app)
# -------------------------------------------------------------------------
FROM base AS deploy

# Only what pnpm deploy needs: manifests + the resolved node_modules tree.
COPY --from=deps /app/package.json        ./package.json
COPY --from=deps /app/pnpm-lock.yaml      ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/.npmrc              ./.npmrc
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY --from=deps /app/node_modules        ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Prune to a self-contained prod-only directory.
RUN pnpm --filter backend --prod --legacy deploy /pruned

# Stage 5: Production runtime
# -------------------------------------------------------------------------
FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

# Self-contained prod workspace (backend source + prod-only node_modules).
COPY --from=deploy /pruned ./

# Compiled output and Prisma artifacts generated in the build stage.
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# Run the server only. Prisma client is generated at build time (see stage 3).
# Migrations are NOT here — they run as a one-shot `quizis-migrate` service
# in docker-compose (see service_completed_successfully gating).
CMD ["node", "dist/src/main.js"]