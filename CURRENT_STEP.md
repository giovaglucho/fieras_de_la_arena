# Paso activo de desarrollo

**Paso activo:** `4.6`
**Estado:** pendiente
**Título:** Implementar caso de uso de combate

## Objetivo

Implementar el caso de uso de combate.

## Permitido en este paso

- Servicio coordina validaciones, motor, persistencia y recompensas.
- Añadir mecanismo de idempotencia.

## Fuera de alcance

- Implementar el límite diario, selección de oponente o arena; corresponden a pasos posteriores de la hoja de ruta.
- Implementar endpoints o interfaz de combate e historial; corresponden a pasos posteriores de la hoja de ruta.

## Criterios de aceptación

- Un mismo request no duplica pelea ni recompensa; fallos no aparentan una victoria.

## Al terminar

Informar los resultados y detenerse. No seleccionar ni implementar el paso siguiente automáticamente. El usuario actualizará este archivo cuando decida continuar.
