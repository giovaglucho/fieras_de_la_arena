# Paso activo de desarrollo

**Paso activo:** `10.8.2`
**Estado:** autorizado; pendiente de implementación
**Título:** Persistir y resolver mascotas

## Objetivo

Permitir que los luchadores obtengan acompañantes originales que influyan de forma limitada y explícita en la simulación.

## Tareas permitidas

- Persistir y resolver mascotas en el servidor.
- Validar la propiedad de las mascotas.
- Hacer idempotente su adquisición.
- Versionar y hacer reproducibles sus estadísticas y efectos.
- Guardar snapshots históricos completos.
- Mantener compatibilidad con luchadores existentes sin mascotas.

## Fuera de alcance

- Mostrar la colección o la participación de mascotas (10.8.3).
- Implementar cualquier otro paso de la hoja de ruta.

## Criterios de aceptación

- Propiedad validada en servidor.
- Adquisición idempotente.
- Estadísticas y efectos versionados y reproducibles.
- Snapshots históricos completos.
- Luchadores existentes funcionan sin mascotas.

## Pruebas y verificación

- Propietario/no propietario.
- Desbloqueo.
- Semilla.
- Límites.
- Combinación con habilidad/equipo.
- Replay.

## Dependencia

- 10.8.1.

## Al terminar

Informar resultados y detenerse. No iniciar ningún paso posterior.
