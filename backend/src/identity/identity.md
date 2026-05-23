# 👤 Identity Context

## Responsabilidad
Gestión de la identidad, autenticación, autorización y perfiles de usuario. Es el guardián de quién puede entrar y qué puede hacer en el sistema.

## Contenido
- **`auth/`**: Lógica de login, registro y tokens JWT.
- **`users/`**: Gestión de la entidad principal de usuario y su perfil (consolidado).
- **`roles/` & `permissions/`**: Control de acceso basado en roles (RBAC).
- **`sessions/`**: Seguimiento de sesiones activas.
- **`menus/`**: Estructura de navegación permitida según permisos.

## Screaming Architecture
Al abrir esta carpeta, queda claro que el sistema maneja un modelo de seguridad complejo. Cada sub-módulo es una pieza del rompecabezas de "Identidad".
