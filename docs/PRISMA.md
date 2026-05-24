# Guía de Prisma ORM 🗄️💎

Este documento explica cómo gestionar la base de datos de **Quizis** utilizando Prisma, el ORM que conecta nuestro NestJS con PostgreSQL (Supabase).

---

## 1. Conceptos Fundamentales

Prisma actúa como un puente entre tu código TypeScript y la base de datos.
*   **Schema (`prisma/schema`)**: Es la única fuente de verdad. Aquí defines tus modelos (Tablas).
*   **Prisma Client**: Un paquete generado automáticamente que te da autocompletado total al hacer consultas.
*   **Migrations**: Un historial de cambios que asegura que todos los desarrolladores tengan la misma estructura de tablas.

---

## 2. Comandos Esenciales

*Debes ejecutarlos dentro de la carpeta `/backend` o usar `pnpm exec`.*

| Comando | Qué hace | Cuándo usarlo |
| :--- | :--- | :--- |
| `pnpm exec prisma generate` | Regenera el código del cliente. | Siempre que cambies el archivo `.prisma`. |
| `pnpm exec prisma migrate dev` | Crea una migración y actualiza tu DB local. | Cuando agregas campos o tablas nuevas. |
| `pnpm exec prisma studio` | Abre una interfaz web para ver los datos. | Cuando quieras editar datos manualmente sin SQL. |
| `pnpm exec prisma db seed` | Llena la base de datos con datos iniciales. | La primera vez que instalas el proyecto. |
| `pnpm exec prisma migrate deploy` | Aplica migraciones pendientes (Producción). | Solo lo usa el servidor de despliegue (Render). |

---

## 3. ¿Por qué es necesario?

1.  **Type Safety**: Si cambias el nombre de una columna en la DB, Prisma hará que tu código TypeScript de error. **Nada de errores en tiempo de ejecución.**
2.  **Sincronización**: Al usar migraciones, evitas el clásico "en mi máquina funciona pero en la tuya no existe la tabla".
3.  **Abstracción**: No necesitas escribir SQL puro. Usas funciones de JavaScript que son mucho más fáciles de leer y mantener.
4.  **Autocompletado**: Al escribir `this.prisma.usuario.find...`, el editor te sugiere exactamente qué campos existen.

---

## 4. Estructura de Archivos en Quizis

*   **`backend/prisma/schema/base.prisma`**: Configuración principal.
*   **`backend/prisma/schema/models/`**: Aquí separamos las tablas por módulos para que el archivo no sea gigante.
*   **`backend/prisma/seeds/`**: Scripts para crear usuarios y roles de prueba automáticamente.

---

## 5. ¡Cuidado! ⚠️

*   **Nunca borres la carpeta `migrations`**: Es el historial de tu base de datos.
*   **No edites la DB manualmente**: Usa siempre el archivo `.prisma` y `migrate dev` para que los cambios queden registrados.
*   **DATABASE_URL**: Asegúrate de tener esta variable en tu `.env` apuntando a Supabase o tu Postgres local.
