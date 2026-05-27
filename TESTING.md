# Testing — Quizis

Guía de comandos para ejecutar los diferentes tipos de pruebas del proyecto.

---

## Prerequisitos

### Backend — variables de entorno para tests

Los integration tests necesitan una base de datos real. Crea `backend/.env.test`:

```env
# PostgreSQL (puede ser la misma DB de dev o una separada)
DATABASE_URL=postgresql://tu_user:tu_pass@localhost:5432/quizis_test

# JWT
JWT_ACCESS_SECRET=test-access-secret-integration
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=test-refresh-secret-integration
JWT_REFRESH_EXPIRES_IN=7d
JWT_ROOM_SECRET=test-room-secret
JWT_ROOM_EXPIRES_IN=1h

NODE_ENV=test
PORT=3001
```

> Los unit tests **no** requieren `.env.test` — todo está mockeado.

---

## Backend

Todos los comandos se ejecutan desde la raíz del monorepo con pnpm workspaces.

### Unit tests

Pruebas aisladas con mocks. No requieren DB ni servicios externos.

```bash
# Ejecutar una vez
pnpm --filter backend test

# Modo watch (re-ejecuta al guardar)
pnpm --filter backend test:watch

# Con reporte de cobertura
pnpm --filter backend test:cov

# Modo debug (adjuntar debugger en puerto 9229)
pnpm --filter backend test:debug
```

### Integration tests

Pruebas contra una DB real. Requieren `backend/.env.test` configurado y PostgreSQL corriendo.

```bash
pnpm --filter backend test:integration
```

> Ejecuta en serie (`--runInBand`) para evitar conflictos entre tests que comparten DB.
> Los tests crean y limpian su propia data — no afectan data existente.

### E2E tests

Pruebas end-to-end contra la app completa (AppModule completo + supertest).

> ⚠️ Requieren DB **y** Redis corriendo.

```bash
pnpm --filter backend test:e2e
```

---

## Frontend

### Unit tests

Usa Angular TestBed + Vitest.

```bash
# Ejecutar una vez
pnpm --filter frontend test

# Modo watch
pnpm --filter frontend test:watch
```

---

## Todos los tests (monorepo)

Ejecuta unit tests de todos los packages en paralelo.

```bash
pnpm test
```

Modo watch en todos los packages:

```bash
pnpm test:watch
```

---

## Filtrar tests específicos

### Por archivo

```bash
# Un archivo específico
pnpm --filter backend test -- --testPathPattern="login.use-case"

# Un directorio
pnpm --filter backend test -- --testPathPattern="identity/auth"
```

### Por nombre de test

```bash
pnpm --filter backend test -- --testNamePattern="should login successfully"
```

### Integration tests de un módulo específico

```bash
pnpm --filter backend test:integration -- --testPathPattern="auth"
```

---

## Cobertura

```bash
# Reporte en consola + HTML en backend/coverage/
pnpm --filter backend test:cov

# Abrir reporte HTML
xdg-open backend/coverage/lcov-report/index.html
```

---

## Estructura de tests

```
backend/
├── src/
│   └── **/*.spec.ts          ← Unit tests (junto al código)
└── test/
    ├── jest-integration.json ← Config para integration tests
    ├── jest-e2e.json         ← Config para e2e tests
    ├── helpers/
    │   ├── create-auth-test-app.ts   ← Factory: app sin Redis/WS
    │   └── db-test.helper.ts         ← Seed y cleanup de DB
    ├── integration/
    │   └── auth/
    │       └── auth.integration.spec.ts  ← Auth: login, refresh, logout
    └── app.e2e-spec.ts       ← E2E placeholder (pendiente)

frontend/
└── src/
    └── **/*.spec.ts          ← Unit tests Angular
```

---

## Tipos de test y cuándo usar cada uno

| Tipo | Velocidad | Requiere infra | Qué prueba |
|------|-----------|---------------|------------|
| **Unit** | Rápido (~ms) | No | Lógica aislada, un use-case o service |
| **Integration** | Medio (~s) | PostgreSQL | Flujo completo con DB real |
| **E2E** | Lento (~s) | PostgreSQL + Redis | App completa vía HTTP |
