# Arquitectura del Sistema — Quizis

Este documento describe la arquitectura técnica, el modelo de datos y el flujo de interacción de la plataforma **Quizis**, inspirada en "¿Quién quiere ser millonario?".

## 1. Visión General de la Arquitectura

El sistema sigue una arquitectura de **Monorepo** con una clara separación entre el Frontend (Angular) y el Backend (NestJS). La comunicación es híbrida: REST para gestión administrativa y WebSockets para la experiencia de juego en tiempo real.

```mermaid
graph TD
    User((Participante)) -->|Angular App| FE[Frontend - Angular]
    Admin((Admin/Ing.)) -->|Angular App| FE
    
    FE -->|REST API / JWT| BE[Backend - NestJS]
    FE -->|WebSockets / Socket.io| BE
    
    BE -->|Prisma ORM| DB[(PostgreSQL)]
    BE -->|Pub/Sub & Cache| RD[(Redis)]
    BE -->|External API| AI[OpenAI / Gemini API]
```

---

## 2. Modelo de Datos (ER)

El esquema de base de datos está normalizado para soportar múltiples salas, bancos de preguntas extensos y el historial detallado de cada ronda de juego.

```mermaid
erDiagram
    USUARIOS ||--o{ SALAS : gestiona
    SALAS ||--|{ PREGUNTAS : contiene
    SALAS ||--o{ RONDAS : ejecuta
    SALAS ||--|{ SALA_COMODINES : configura
    COMODINES ||--o{ SALA_COMODINES : define
    
    RONDAS ||--o{ RESPUESTAS_RONDA : registra
    PREGUNTAS ||--o{ RESPUESTAS_RONDA : evaluada_en
    RONDAS ||--o{ VOTOS_PUBLICO : recibe
    
    USUARIOS {
        int usuario_id PK
        string email
        string password
        int rol_id FK
    }
    
    SALAS {
        int sala_id PK
        string nombre
        string token_compartido UK
        string estado
        int limite_preguntas
    }
    
    PREGUNTAS {
        int pregunta_id PK
        string texto
        json opciones
        string respuesta_correcta
        int nivel
    }
    
    RONDAS {
        int ronda_id PK
        int sala_id FK
        string nickname
        string estado
        json preguntas_asignadas
    }
    
    COMODINES {
        int comodin_id PK
        string nombre UK
    }
    
    SALA_COMODINES {
        int sala_id FK
        int comodin_id FK
        boolean activo
    }
```

---

## 3. Flujo de Partida (Tiempo Real)

El flujo de juego depende de eventos sincronizados vía WebSockets. Redis actúa como el motor de estado para asegurar que todos los observadores vean lo mismo que el encuestado.

```mermaid
sequenceDiagram
    participant A as Admin (Ingeniero)
    participant S as Servidor (NestJS + Redis)
    participant E as Encuestado (Estudiante)
    participant O as Observadores (Público)
    
    A->>S: Iniciar Sala (REST)
    O->>S: Unirse con Nickname (WS)
    A->>S: Promocionar Observador a Encuestado
    S->>E: Notificar Rol: Encuestado
    
    A->>S: Lanzar Pregunta 1
    S->>E: Mostrar Pregunta + Opciones
    S->>O: Mostrar Progreso en Vivo
    
    Note over E,O: El estudiante decide usar comodín
    E->>S: Activar Comodín: Público
    S->>O: Habilitar Votación
    O->>S: Enviar Votos
    S->>E: Mostrar Resultado de Votación
    
    E->>S: Enviar Respuesta
    S->>S: Validar Respuesta (DB)
    S->>A: Notificar Resultado (Correcto/Error)
    S->>O: Sincronizar Pantalla de Resultados
```

---

## 4. Estrategia de Comodines (Lifelines)

Los comodines están desacoplados de la sala mediante un catálogo centralizado. Esto permite extender el juego fácilmente.

| Comodín | Implementación Técnica |
|---|---|
| **🗳️ Público** | WS Event `audience:vote` -> Redis Aggregation -> WS Emit `audience:result`. |
| **🤖 IA** | Backend Service -> LLM API -> Prompt dinámico con contexto de pregunta -> Sugerencia. |
| **📞 Llamada** | WS Event `call:request` -> Target UI Notification -> Participant Input -> WS Emit. |

---

## 5. Seguridad y Acceso

1.  **Administradores:** Autenticación estricta vía **JWT** (Access + Refresh Tokens). Solo ellos pueden realizar acciones destructivas o de configuración.
2.  **Participantes:** Acceso por **Token de Sala** (UUID no predecible). No requieren cuenta. Su identidad es volátil (nickname + Socket ID) pero sus resultados se persisten para el historial.
3.  **Estado Stateless:** El servidor no guarda el estado de la partida en memoria local; todo se coordina a través de **Redis**, permitiendo escalar el backend horizontalmente.
