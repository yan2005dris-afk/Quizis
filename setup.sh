#!/bin/bash
set -e

echo "🚀 Quizis - Setup"

# ─── 1. Dependencias ────────────────────────────────────────
echo "📦 Instalando dependencias..."
corepack enable && corepack prepare pnpm@latest --activate
pnpm install

# ─── 2. .env ─────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "📋 Creando .env desde .env-example..."
  cp .env-example .env
else
  echo "✅ .env ya existe"
fi

# ─── 3. Prisma ───────────────────────────────────────────────
echo "🔧 Generando Prisma client..."
pnpm --filter backend run prisma:generate

echo "🗄️  Corriendo migrations..."
pnpm --filter backend run prisma:migrate

# ─── 4. Docker ───────────────────────────────────────────────
echo "🐳 Levantando servicios (postgres, redis)..."
docker compose up -d postgres redis

echo ""
echo "✅ Setup completo. Corré el backend con:"
echo "   pnpm backend:dev"
echo ""
echo "O todo con Docker:"
echo "   docker compose up --build -d"
