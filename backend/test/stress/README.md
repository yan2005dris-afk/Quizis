# Pruebas de Estrés — Votación Simultánea

Pruebas de concurrencia para el sistema de votación de audiencia en tiempo real.
Simulan cientos de participantes uniéndose y votando simultáneamente vía Socket.io.

---

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `setup.ts` | Consulta la DB y obtiene los IDs reales necesarios para los tests |
| `vote-stress.yml` | Test de rampa: calentamiento → carga normal → pico masivo |
| `vote-concurrent.yml` | Test de disparo: 500 usuarios en 2 segundos |

---

## Requisitos previos

### 1. Docker corriendo con los contenedores del proyecto

```bash
docker compose up -d
```

Verificar que todos estén healthy:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Deben aparecer: `quizis-backend`, `quizis-frontend`, `quizis-postgres`, `quizis-redis`.

### 2. Artillery instalado

```bash
# Desde la raíz del proyecto
pnpm add -w artillery artillery-engine-socketio-v3
```

### 3. Una sala activa con pregunta liberada

El backend necesita una sala en estado `EN_VIVO` con una ronda iniciada y una pregunta visible para la audiencia. Ver sección [Preparar datos de prueba](#preparar-datos-de-prueba).

---

## Preparar datos de prueba

### Paso 1 — Crear una sala desde el frontend

1. Ir a `http://localhost/salas`
2. Crear una sala con un banco que tenga al menos 15 preguntas (ej. "Cultura General")
3. La sala queda en estado **BORRADOR**

### Paso 2 — Insertar participante de prueba (requerido para abrir sala)

El backend exige al menos 1 estudiante para pasar a EN_VIVO. Insertar uno directamente en la DB:

```bash
docker exec quizis-postgres psql -U admin -d quizis_db -c \
  "INSERT INTO participantes (sala_id, nickname, rol, actualizado_en)
   VALUES (<SALA_ID>, 'stress-tester', 'estudiante', NOW());"
```

Reemplazar `<SALA_ID>` con el ID de la sala creada.

### Paso 3 — Abrir sala e iniciar partida

1. Desde el frontend, abrir la sala → estado **ESPERANDO_ALUMNOS**
2. Iniciar la partida → estado **EN_VIVO** (se crea la ronda)

### Paso 4 — Liberar una pregunta

Desde el panel de administración de la sala, liberar la primera pregunta para que sea visible a la audiencia.

### Paso 5 — Obtener IDs reales

```bash
DATABASE_URL="postgresql://admin:root123@localhost:5434/quizis_db" \
  backend/node_modules/.bin/tsx backend/test/stress/setup.ts
```

> **Nota:** El puerto es `5434` cuando se usa `docker-compose.override.yml` con GPU.
> Sin override, usar `5433`.

Salida esperada:

```
=== VALORES PARA vote-stress.yml y vote-concurrent.yml ===

TOKEN_SALA:   "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
SALA_ID:       49
RONDA_ID:      1
PREGUNTA_ID:   1
OPCION_IDS:    1, 2, 3, 4
```

### Paso 6 — Actualizar los archivos yml

Editar `vote-stress.yml` y `vote-concurrent.yml`, reemplazar la sección `variables`:

```yaml
variables:
  TOKEN_SALA: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # valor de setup.ts
  SALA_ID: 49       # valor de setup.ts
  RONDA_ID: 1       # valor de setup.ts
  PREGUNTA_ID: 1    # valor de setup.ts
```

---

## Ejecutar las pruebas

### Test concurrente (recomendado primero)

500 usuarios en 2 segundos — verifica que el servidor no colapse bajo carga puntual:

```bash
node_modules/.bin/artillery run backend/test/stress/vote-concurrent.yml
```

Duración: ~10 segundos.

### Test de estrés completo

3 fases progresivas — mide el comportamiento bajo carga sostenida y pico:

```bash
node_modules/.bin/artillery run backend/test/stress/vote-stress.yml
```

| Fase | Configuración | Duración |
|------|--------------|----------|
| Calentamiento | 1 usuario/seg | 10s |
| Carga normal | 10 → 50 usuarios/seg (rampa) | 30s |
| Pico masivo | 200 usuarios/seg | 10s |

Duración total: ~2 minutos.

---

## Interpretar resultados

### Métricas clave en el reporte final

```
vusers.created: ............... 2910   ← usuarios lanzados
vusers.completed: ............. 2900   ← usuarios que completaron el flujo
vusers.failed: ................   10   ← errores (timeout / conexión)

engine.socketio.emit: ......... 5800   ← eventos emitidos (join + vote)

vusers.session_length:
  p95: ...................... 20958    ← 95% completó en <21s
  p99: ...................... 49528    ← 99% completó en <50s
```

### ¿Qué es aceptable?

| Métrica | Aceptable | Preocupante |
|---------|-----------|-------------|
| `vusers.failed` | < 1% | > 5% |
| p95 session_length | < 5s en carga normal | > 15s |
| Errores en pico (200/s) | Timeouts ocasionales | Crash del servidor |

### Verificar integridad en Redis

Después del test, confirmar que los votos se registraron correctamente:

```bash
# Distribución de votos por opción
docker exec quizis-redis redis-cli HGETALL "dist:<RONDA_ID>:<PREGUNTA_ID>"

# Cantidad de votos únicos registrados
docker exec quizis-redis redis-cli HLEN "votes:<RONDA_ID>:<PREGUNTA_ID>"
```

Los totales de `dist:` y `HLEN votes:` deben coincidir.

Ejemplo de resultado saludable:

```
1 → 792
2 → 780
3 → 805
4 → 813
Total: 3190 (== HLEN votes)
```

---

## Monitoreo en tiempo real (opcional)

Mientras corre el test, en otra terminal:

```bash
# Ver todos los comandos Redis relacionados con votos
docker exec quizis-redis redis-cli monitor | grep "dist:\|votes:"

# Ver logs del backend en tiempo real
docker logs -f quizis-backend
```

---

## Notas importantes

- **No reutilizar la misma pregunta** entre runs sin limpiar Redis. Los votos anteriores persisten y el sistema deduplica por `participanteId`.
- Para limpiar entre runs: `docker exec quizis-redis redis-cli FLUSHDB` (borra toda la caché).
- Los `participanteId` en los tests son aleatorios (`$randomNumber(1, 9999999)`). Colisiones son raras pero posibles — el sistema los trata como el mismo participante votando dos veces (solo cuenta el primero).
- El target en los yml es `http://localhost:3000` (backend directo, no nginx) para evitar la capa de proxy en la medición.
