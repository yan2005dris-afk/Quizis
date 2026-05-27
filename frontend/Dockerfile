# =============================================================================
# Frontend Dockerfile — Angular (static) + Nginx (multi-stage)
# Build context: project root (.) — pnpm workspace needs pnpm-workspace.yaml
# =============================================================================

# Stage 1: Install dependencies and build Angular app
# -------------------------------------------------------------------------
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files — needed for pnpm install --frozen-lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY frontend/package.json ./frontend/
COPY frontend/angular.json ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/tsconfig.app.json ./frontend/

# Install ALL dependencies for the frontend workspace package
RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend source
COPY frontend/ ./frontend/

# Build Angular app (static output mode — no SSR server)
RUN pnpm --filter frontend run build

# Stage 2: Nginx production server
# -------------------------------------------------------------------------
FROM nginx:alpine

# Copy custom Nginx config (already references quizis-backend:3000)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx welcome page so Angular's index.csr.html takes over
RUN rm -rf /usr/share/nginx/html/*

# Copy the static browser build output
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
