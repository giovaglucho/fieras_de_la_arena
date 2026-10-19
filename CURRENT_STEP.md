# Paso activo de desarrollo

**Paso activo:** `2.6`
**Estado:** pendiente
**Título:** Integrar estado de sesión y rutas protegidas

## Objetivo

Integrar en el cliente el estado de sesión real, resolver su carga tras una recarga y al iniciar o cerrar sesión, y proteger las rutas según la sesión confirmada por el backend.

## Permitido en este paso

- Añadir un contexto React sencillo para la sesión.
- Resolver la carga del estado de sesión al recargar la aplicación.
- Integrar el inicio de sesión y el cierre de sesión con el estado de sesión del cliente.
- Hacer que las rutas protegidas se comporten según el estado real de la sesión.

## Fuera de alcance

- Crear luchadores o implementar rutas, modelos y funciones de juego de pasos posteriores.
- No implementar tareas posteriores de la hoja de ruta.

## Criterios de aceptación

- las rutas protegidas se comportan según el estado real de la sesión; no basta con ocultar enlaces.

## Al terminar

Informar los resultados y detenerse. No seleccionar ni implementar el paso siguiente automáticamente. El usuario actualizará este archivo cuando decida continuar.
