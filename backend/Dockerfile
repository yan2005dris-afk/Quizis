# syntax=docker/dockerfile:1

# =============================================================================
# Backend Dockerfile — NestJS + Prisma (Optimized with pnpm)
# Build context: project root (.)
# =============================================================================

# Stage 1: Base image with pnpm setup
# -------------------------------------------------------------------------
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

WORKDIR /app

# Stage 2: Install dependencies
# -------------------------------------------------------------------------
FROM base AS deps

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Copy backend package.json
COPY backend/package.json ./backend/

# Install dependencies using cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Build the application
# -------------------------------------------------------------------------
FROM base AS build

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy workspace configuration and backend source
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/ ./backend/

# Generate Prisma client and compile NestJS
RUN pnpm --filter backend exec prisma generate && \
    pnpm --filter backend run build

# Stage 4: Production pruned dependencies
# -------------------------------------------------------------------------
FROM base AS deploy

# Copy the entire workspace to allow pnpm to resolve internal links (if any)
COPY --from=build /app ./

# Use pnpm deploy to create a self-contained production-ready directory
# This prunes devDependencies and handles workspace logic
RUN pnpm --filter backend --prod --legacy deploy /pruned

# Stage 5: Production runtime
# -------------------------------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app
RUN apk add --no-cache curl

# Copy the pruned workspace from deploy stage
COPY --from=deploy /pruned ./

# Copy build artifacts (pnpm deploy doesn't copy the dist folder by default)
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# Start: generate client, apply pending migrations, seed database, then launch the NestJS server
# Note: Ensure 'prisma' and 'tsx' are in dependencies (not devDependencies) if you run these here
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js"]
