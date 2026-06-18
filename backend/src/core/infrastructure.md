# 🧱 Infrastructure Context

## Responsabilidad
Este contexto contiene los detalles técnicos y herramientas transversales que dan soporte a los dominios de negocio. Aquí vive el "cómo" se hacen las cosas a nivel técnico, no el "qué" hace el negocio.

## Contenido
- **`database/`**: Configuración de Prisma y servicios de persistencia.
- **`common/`**: Decoradores, filtros, guards, interceptores y utilidades reutilizables.
- **`config/`**: Constantes globales y configuración de la aplicación.
- **`storage/`**: Integración con servicios de almacenamiento (S3/Minio).
- **`mail/`**: Infraestructura de envío de correos masivos con pg-boss y Nodemailer.

## Screaming Architecture
La infraestructura debe ser **independiente del dominio**. Los módulos de negocio no deben conocer los detalles de implementación de la infraestructura, sino solo consumir sus servicios.
