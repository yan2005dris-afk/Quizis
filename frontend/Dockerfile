# syntax=docker/dockerfile:1

# =============================================================================
# Frontend Dockerfile — Angular + Nginx (Optimized with pnpm)
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
# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 3: Build the application
# -------------------------------------------------------------------------
FROM base AS build

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Copy workspace configuration and frontend source
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY frontend/ ./frontend/

# Build Angular app
RUN pnpm --filter frontend run build

# Stage 4: Nginx production server
# -------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copy custom Nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the static browser build output from build stage
# Note: Angular 17+ with SSR enabled puts browser files in dist/frontend/browser
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
