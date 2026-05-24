# ─── Stage 1: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Instalamos solo lo del frontend
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm run build

# ─── Stage 2: Serve ───────────────────────────────────────────
FROM nginx:alpine AS production

# Limpiamos el directorio por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiamos los archivos estáticos construidos
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Aseguramos que exista un index.html en la raíz para el fallback de Nginx
RUN if [ ! -f /usr/share/nginx/html/index.html ] && [ -f /usr/share/nginx/html/index.csr.html ]; then \
    cp /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html; \
    fi

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
