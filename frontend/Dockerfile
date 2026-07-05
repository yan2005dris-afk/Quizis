# syntax=docker/dockerfile:1

# =============================================================================
# Frontend Dockerfile — Angular + Nginx
# Build context: project root (.)
# Cache strategy: BuildKit cache mount on /pnpm/store.
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

# Manifests only — invalidates this layer only when they change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY frontend/package.json ./frontend/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 3: Build the application
# -------------------------------------------------------------------------
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY frontend/ ./frontend/

# Build the Angular app, reusing the same /pnpm/store cache.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter frontend run build

# Stage 4: Nginx production server
# -------------------------------------------------------------------------
FROM nginx:alpine AS production

# Custom Nginx config for SPA routing + API proxy.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# Angular 17+ with SSR puts browser files at dist/frontend/browser.
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80