# 🎮 Juego Context

## Responsabilidad
Núcleo de la experiencia de juego en tiempo real. Gestiona la creación de bancos de preguntas, la coordinación de salas de juego, la votación de la audiencia y la sincronización vía WebSockets.

## Contenido
- **`bancos/`**: Gestión de colecciones de preguntas y opciones. Soporta importación masiva y edición atómica.
- **`salas/`**: Coordinación de partidas activas, seguimiento de participantes y rondas.
- **`votos/`**: Lógica de votación de alto rendimiento con validación atómica en Redis y persistencia diferida (Bulk Insert).
- **`websockets/`**: Puerta de enlace (`JuegoGateway`) para la comunicación bidireccional en tiempo real.

## Screaming Architecture
Esta carpeta "grita" que estamos ante el motor principal de Quizis. Cada sub-módulo está organizado por casos de uso para garantizar que la lógica de negocio esté aislada de la infraestructura.
