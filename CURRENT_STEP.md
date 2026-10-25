# Paso activo de desarrollo

**Paso activo:** `10.5.2`
**Estado:** autorizado; pendiente de implementación
**Título:** Implementar crecimiento aleatorio seguro

## Objetivo

Sustituir el crecimiento fijo actual por una mejora aleatoria controlada, conservando progresión justa y auditable.

## Tareas permitidas

- Sortear en el servidor al confirmar XP; actualizar estadísticas de forma atómica/idempotente; guardar información necesaria para explicar progresión; versionar aleatoriedad si afecta a una pelea.
- Ejecutar las pruebas de semilla controlada, distribución, concurrencia, niveles múltiples, reintentos, fallo transaccional y regresión de luchadores antiguos.

## Fuera de alcance

- Mostrar crecimiento y progreso en la interfaz (paso 10.5.3).
- Iniciar otros pasos de la hoja de ruta o añadir funcionalidad ajena a 10.5.2.

## Criterios de aceptación

- Cliente no puede escoger ni inflar aumentos; reintentos no repiten mejoras; fallo de persistencia no deja nivel y atributos desincronizados; las mismas entradas/versiones producen el resultado esperado; los luchadores existentes mantienen base y nivel.

## Pruebas

- Semilla controlada, distribución, concurrencia, niveles múltiples, reintentos, fallo transaccional y regresión de luchadores antiguos.

## Dependencia

- 10.5.1.

## Al terminar

Informar resultados y detenerse. No iniciar 10.5.3 ni ningún otro paso posterior.
