# Paso activo de desarrollo

**Paso activo:** `5.1`
**Estado:** pendiente
**Título:** Implementar DailyActivity y reserva atómica

## Objetivo

Implementar DailyActivity y la reserva atómica del intento diario de combate.

## Permitido en este paso

- Límite inicial de tres intentos en UTC.
- Índice único usuario+fecha y actualización segura ante peticiones concurrentes.

## Fuera de alcance

- Implementar selección de rival; corresponde al paso 5.2.
- Añadir rival de entrenamiento de respaldo; corresponde al paso 5.3.
- Exponer endpoints de arena e historial; corresponde al paso 5.4.
- Crear pantallas de arena, resultado e historial; corresponden a los pasos 5.5, 5.6 y 5.7.

## Criterios de aceptación

- Dos solicitudes simultáneas no exceden el límite.

## Al terminar

Informar los resultados y detenerse. No seleccionar ni implementar el paso siguiente automáticamente. El usuario actualizará este archivo cuando decida continuar.
