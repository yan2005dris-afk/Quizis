# Guía de Calidad: Testing y Linting 🧪✨

Este documento detalla las herramientas y procesos utilizados en **Quizis** para garantizar un código limpio, estandarizado y libre de errores.

---

## 1. Herramientas Utilizadas

### Linting y Formateo
*   **ESLint**: Analiza el código en busca de errores potenciales y malas prácticas.
*   **Prettier**: Formatea el código automáticamente para que sea consistente en todo el equipo.
*   **Angular ESLint**: Reglas específicas para asegurar que el frontend siga las mejores prácticas de Angular.

### Testing
*   **Jest (Backend)**: El estándar de oro para probar aplicaciones Node.js/NestJS. Rápido y con gran reporte de cobertura.
*   **Vitest (Frontend)**: Motor de pruebas moderno para Angular 18+. Es extremadamente veloz y no requiere un navegador real (usa JSDOM).

---

## 2. Comandos Principales

### En el Backend (`/backend`)
| Comando | Descripción |
| :--- | :--- |
| `pnpm run lint` | Ejecuta el linter y corrige errores automáticos. |
| `pnpm run test` | Ejecuta todas las pruebas unitarias una sola vez. |
| `pnpm run test:watch` | Modo interactivo: corre los tests cada vez que guardas un archivo. |
| `pnpm run test:cov` | Genera un reporte de cobertura (qué porcentaje del código está probado). |
| `pnpm run test:e2e` | Ejecuta pruebas de extremo a extremo (Simula peticiones HTTP reales). |

### En el Frontend (`/frontend`)
| Comando | Descripción |
| :--- | :--- |
| `pnpm run lint` | Ejecuta ESLint en archivos `.ts` y `.html`. |
| `pnpm run test` | Inicia Vitest en modo interactivo. |
| `pnpm run test --no-watch` | Corre los tests una vez y termina (usado en CI). |

---

## 3. ¿Por qué es necesario?

1.  **Evitar Regresiones**: Los tests aseguran que, al arreglar algo, no rompas una funcionalidad que ya funcionaba.
2.  **Consistencia**: El linter evita discusiones en el equipo sobre si usar `"` o `'`, o cuántos espacios poner. Todo es automático.
3.  **Documentación Viva**: Un test bien escrito explica qué se espera que haga el código mejor que cualquier comentario.
4.  **Seguridad en el Despliegue**: El CI (GitHub Actions) bloquea el despliegue si los tests fallan o hay errores de linter.

---

## 4. Flujo de Trabajo Recomendado

Antes de cada `git commit` o `git push`, sigue estos pasos:

1.  **Lint**: `pnpm run lint` (corrige el formato y errores de sintaxis).
2.  **Test**: `pnpm run test` (asegura que la lógica sigue siendo correcta).
3.  **Build**: `pnpm run build` (verifica que el proyecto compila sin errores).

Si estos tres pasan en verde, ¡tu código está listo para producción! 🚀
