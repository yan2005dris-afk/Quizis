# UI Components — Quizis Design System

Librería de componentes globales y reutilizables del proyecto. Todos usan la paleta UPSE definida en `src/styles.scss`.

**Importar desde:**
```typescript
import { ButtonComponent, AlertComponent, InputComponent, CardPreguntaComponent, CountdownComponent } from '@app/shared/ui';
```

---

## Paleta de colores

| Token CSS | Hex | Uso |
|---|---|---|
| `--color-primary` | `#1D2667` | Navy — navbar, botones primarios |
| `--color-success` | `#8CC63F` | Verde — botones de éxito, comenzar |
| `--color-accent` | `#4FC3F7` | Cyan — hover, elementos secundarios |
| `--color-warning` | `#F59E0B` | Amber — comodín reloj, alertas |
| `--color-danger` | `#EF4444` | Coral — respuestas incorrectas, pausar |
| `--color-ai` | `#8B5CF6` | Morado — comodín IA |
| `--color-text` | `#1E293B` | Texto principal |
| `--color-sub` | `#64748B` | Texto secundario |
| `--color-border` | `#E2E8F0` | Bordes |
| `--color-surface` | `#FFFFFF` | Cards, fondos blancos |

---

## 1. Button `<app-button>`

Botón reutilizable con 6 variantes de color, 3 tamaños, estado loading y soporte para formularios.

### Inputs

| Input | Tipo | Default | Descripción |
|---|---|---|---|
| `variant` | `ButtonVariant` | `'primary'` | Estilo visual del botón |
| `size` | `ButtonSize` | `'md'` | Tamaño del botón |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Tipo HTML del botón |
| `disabled` | `boolean` | `false` | Deshabilita el botón |
| `loading` | `boolean` | `false` | Muestra spinner y bloquea clicks |
| `fullWidth` | `boolean` | `false` | Ocupa el 100% del contenedor |

### Outputs

| Output | Tipo | Descripción |
|---|---|---|
| `clicked` | `void` | Emite al hacer click (solo si no está disabled/loading) |

### Variantes disponibles

| Variante | Color | Cuándo usar |
|---|---|---|
| `primary` | Navy `#1D2667` | Acción principal de la pantalla |
| `secondary` | Verde `#8CC63F` | Acción de éxito o iniciar partida |
| `danger` | Coral `#EF4444` | Pausar, eliminar, acción destructiva |
| `ghost` | Borde navy | Acción secundaria, SSO, alternativas |
| `accent` | Cyan `#4FC3F7` | Elementos interactivos secundarios |
| `ai` | Morado `#8B5CF6` | Comodín IA, funciones de inteligencia artificial |

### Ejemplos

```html
<!-- Botón principal -->
<app-button variant="primary" (clicked)="guardar()">
  Guardar
</app-button>

<!-- Botón de submit en formulario con loading -->
<app-button type="submit" variant="primary" size="lg" [fullWidth]="true" [loading]="isLoading()">
  Iniciar sesión
</app-button>

<!-- Botón de peligro -->
<app-button variant="danger" (clicked)="pausar()">
  PAUSAR
</app-button>

<!-- Botón IA -->
<app-button variant="ai" size="sm" (clicked)="usarComodinIA()">
  Comodín IA
</app-button>

<!-- Botón fantasma — no dispara form -->
<app-button type="button" variant="ghost" [fullWidth]="true">
  Continuar con Google
</app-button>
```

---

## 2. Alert `<app-alert>`

Mensaje de alerta con 4 tipos semánticos, título opcional y opción de cierre.

### Inputs

| Input | Tipo | Default | Descripción |
|---|---|---|---|
| `type` | `AlertType` | `'info'` | Tipo semántico de la alerta |
| `message` | `string` | **requerido** | Texto principal |
| `title` | `string` | `''` | Título en negrita (opcional) |
| `dismissible` | `boolean` | `false` | Muestra botón de cierre |

### Outputs

| Output | Tipo | Descripción |
|---|---|---|
| `dismissed` | `void` | Emite al cerrar (si `dismissible = true`) |

### Tipos disponibles

| Tipo | Color | Cuándo usar |
|---|---|---|
| `success` | Verde | Operación exitosa |
| `warning` | Amber | Advertencia, comodín de tiempo |
| `danger` | Coral | Error, respuesta incorrecta |
| `info` | Navy | Información general |

### Ejemplos

```html
<!-- Error de login -->
<app-alert type="danger" [message]="errorMessage()!" />

<!-- Con título y dismissible -->
<app-alert
  type="warning"
  title="¡Tiempo casi agotado!"
  message="Te quedan menos de 10 segundos."
  [dismissible]="true"
  (dismissed)="cerrarAlerta()" />

<!-- Éxito -->
<app-alert type="success" message="Sala creada correctamente." />
```

---

## 3. Input `<app-input>`

Campo de formulario accesible, compatible con **ReactiveFormsModule** mediante `ControlValueAccessor`.

### Inputs

| Input | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | `string` | `''` | Etiqueta del campo |
| `type` | `InputType` | `'text'` | Tipo HTML del input |
| `placeholder` | `string` | `''` | Texto de placeholder |
| `errorMsg` | `string` | `''` | Mensaje de error (activa estilo rojo) |

### Tipos disponibles

`'text'` · `'email'` · `'password'` · `'number'` · `'tel'` · `'search'`

### Ejemplos

```html
<!-- Input simple -->
<app-input label="Nombre de la sala" placeholder="Ej: Biología 101" />

<!-- Con ReactiveFormsModule -->
<form [formGroup]="form">
  <app-input
    label="Correo electrónico"
    type="email"
    placeholder="ejemplo@upse.edu.ec"
    formControlName="email" />

  <app-input
    label="Contraseña"
    type="password"
    placeholder="••••••••"
    formControlName="password"
    [errorMsg]="passwordError()" />
</form>

<!-- Deshabilitado via form control -->
<app-input label="Código de sala" formControlName="codigo" />
<!-- form.get('codigo').disable() lo deshabilita automáticamente -->
```

---

## 4. CardPregunta `<app-card-pregunta>`

Tarjeta principal del juego. Muestra la pregunta y 4 opciones (A/B/C/D). Bloquea interacción tras elegir una opción.

### Inputs

| Input | Tipo | Default | Descripción |
|---|---|---|---|
| `pregunta` | `string` | **requerido** | Texto de la pregunta |
| `opciones` | `OpcionPregunta[]` | **requerido** | Array de 4 opciones |
| `numeroPregunta` | `number` | `1` | Número de pregunta actual |
| `totalPreguntas` | `number` | `1` | Total de preguntas |
| `bloqueado` | `boolean` | `false` | Bloquea todas las opciones |

### Outputs

| Output | Tipo | Descripción |
|---|---|---|
| `seleccionada` | `OpcionPregunta` | Emite la opción elegida por el alumno |

### Interfaz `OpcionPregunta`

```typescript
interface OpcionPregunta {
  id: string | number;
  texto: string;
}
```

### Ejemplo

```typescript
// component.ts
opciones: OpcionPregunta[] = [
  { id: 1, texto: 'Mitocondria' },
  { id: 2, texto: 'Núcleo' },
  { id: 3, texto: 'Ribosoma' },
  { id: 4, texto: 'Membrana plasmática' },
];

onRespuesta(opcion: OpcionPregunta) {
  console.log('Alumno eligió:', opcion);
}
```

```html
<app-card-pregunta
  pregunta="¿Cuál es la central energética de la célula?"
  [opciones]="opciones"
  [numeroPregunta]="3"
  [totalPreguntas]="10"
  [bloqueado]="esperandoResultado()"
  (seleccionada)="onRespuesta($event)" />
```

---

## 5. Countdown `<app-countdown>`

Contador regresivo circular con anillo SVG animado. Cambia de color según el tiempo restante.

### Inputs

| Input | Tipo | Default | Descripción |
|---|---|---|---|
| `duracion` | `number` | **requerido** | Segundos totales del contador |
| `activo` | `boolean` | `false` | Inicia o pausa el contador |

### Outputs

| Output | Tipo | Descripción |
|---|---|---|
| `tiempoAgotado` | `void` | Emite cuando el contador llega a 0 |

### Estados visuales

| Tiempo restante | Color | Efecto |
|---|---|---|
| > 50% | Verde `#8CC63F` | Normal |
| 25–50% | Amber `#F59E0B` | Advertencia |
| < 25% | Coral `#EF4444` | Pulso animado |

### Ejemplo

```typescript
// component.ts
readonly contadorActivo = signal(false);

iniciarRonda() {
  this.contadorActivo.set(true);
}

onTiempoAgotado() {
  this.contadorActivo.set(false);
  // lógica de fin de ronda
}
```

```html
<app-countdown
  [duracion]="30"
  [activo]="contadorActivo()"
  (tiempoAgotado)="onTiempoAgotado()" />
```

---

## Uso combinado — ejemplo de pantalla de juego

```html
<div class="game-screen">
  <app-countdown
    [duracion]="tiempoRonda()"
    [activo]="rondaActiva()"
    (tiempoAgotado)="finRonda()" />

  <app-card-pregunta
    [pregunta]="preguntaActual().texto"
    [opciones]="preguntaActual().opciones"
    [numeroPregunta]="rondaActual()"
    [totalPreguntas]="totalRondas()"
    [bloqueado]="!rondaActiva()"
    (seleccionada)="responder($event)" />

  @if (mensajeError()) {
    <app-alert type="danger" [message]="mensajeError()!" />
  }

  <app-button variant="danger" (clicked)="pausarPartida()">
    PAUSAR PARTIDA
  </app-button>
</div>
```

---

## Convenciones del proyecto

- Sin `standalone: true` — default en Angular v20+
- `ChangeDetectionStrategy.OnPush` en todos los componentes
- `input()` / `output()` — sin decoradores `@Input` / `@Output`
- `@if`, `@for` — sin `*ngIf` / `*ngFor`
- Sin `ngClass` / `ngStyle` — usar `[class.x]` / `[style.x]`
