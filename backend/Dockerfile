# =============================================================================
# Backend Dockerfile — NestJS + Prisma (multi-stage)
# Build context: project root (.) — pnpm workspace needs pnpm-workspace.yaml
# =============================================================================

# Stage 1: Install all dependencies (deps)
# -------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files — needed for pnpm install --frozen-lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY backend/package.json ./backend/

# Install ALL dependencies (dev + prod) for the backend workspace package
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
# -------------------------------------------------------------------------
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Reuse installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy workspace configs (needed for pnpm commands)
COPY package.json pnpm-workspace.yaml ./

# Copy backend source code, configs, and Prisma schema
COPY backend/ ./backend/

# Generate Prisma client and compile NestJS
RUN cd backend && npx prisma generate && npx nest build

# Stage 3: Production runtime
# -------------------------------------------------------------------------
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl

WORKDIR /app

# Copy production dependencies (installed with frozen lockfile)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile

# Copy built artifacts from build stage
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts

EXPOSE 3000

# Start: apply pending migrations, then launch the NestJS server
CMD cd backend && npx prisma migrate deploy && node dist/src/main.js
