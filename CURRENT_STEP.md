# Paso activo de desarrollo

**Paso activo:** `4.2`
**Estado:** pendiente
**Título:** Implementar simulación determinista

## Objetivo

Semilla proporcionada, orden de actuación, daño y condición de finalización.

## Permitido en este paso

- Semilla proporcionada.
- Orden de actuación.
- Daño.
- Condición de finalización.

## Fuera de alcance

- Añadir pruebas de límites del motor para daño mínimo, orden de turno, fin por KO, máximo de acciones y empates; corresponde al paso 4.3 de la hoja de ruta.
- Implementar cálculo de XP, nivel o ELO; corresponde al paso 4.4 de la hoja de ruta.
- Implementar persistencia de combates o el caso de uso de combate; corresponden a los pasos 4.5 y 4.6 de la hoja de ruta.
- Implementar arena, límite diario, matchmaking, interfaz u otras tareas posteriores de la hoja de ruta.

## Criterios de aceptación

- Misma entrada + misma semilla da mismo resultado y eventos.

## Al terminar

Informar los resultados y detenerse. No seleccionar ni implementar el paso siguiente automáticamente. El usuario actualizará este archivo cuando decida continuar.
