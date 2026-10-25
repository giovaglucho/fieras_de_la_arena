# Paso activo de desarrollo

**Paso activo:** `10.5.1`
**Estado:** autorizado; pendiente de implementación
**Título:** Aprobar reglas de nivel y sorteo de atributos

## Objetivo

Sustituir el crecimiento fijo actual por una mejora aleatoria controlada, conservando progresión justa y auditable.

## Tareas permitidas

- Mapear estadísticas actuales a conceptos de fuerza/agilidad/velocidad; decidir qué atributo puede subir por nivel, magnitud y límites; definir distribución/pesos, niveles múltiples, topes y relación con salud/defensa existentes; conservar o cambiar umbrales de XP solo con decisión explícita.

## Fuera de alcance

- Implementar el crecimiento aleatorio seguro de 10.5.2 o mostrar crecimiento y progreso de 10.5.3.
- Implementar cambios en código. Como paso de diseño, ROADMAP.md limita los cambios a especificación y documentación.

## Criterios de aceptación

- Cada subida tiene una regla y límites conocidos; los niveles ganados de una sola recompensa procesan todos los sorteos correspondientes una vez; no hay valores imposibles ni pérdida silenciosa de XP; la regla nueva está documentada en `PROJECT_SPEC.md`.

## Pruebas/verificación

- Ejemplos de nivel único y múltiple, valores límite, nivel máximo si existe y comparación con progreso actual.

## Dependencia

- 10.1.1.

## Al terminar

Informar resultados y detenerse. No iniciar 10.5.2 ni ningún otro paso posterior.
