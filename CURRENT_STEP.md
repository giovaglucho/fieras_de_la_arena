# Paso activo de desarrollo

**Paso activo:** `10.6.3`
**Estado:** autorizado; pendiente de implementación
**Título:** Mostrar colección, desbloqueos y equipo del combate

## Objetivo

Añadir variedad táctica a la simulación mediante objetos obtenidos por progresión y carga automática, sin exigir microtransacciones ni decisiones de combate en tiempo real.

## Tareas permitidas

- Implementar la UI de colección y la presentación de carga/equipamiento en el resultado e historial.
- Distinguir la colección del luchador de la carga sorteada para cada combate.
- Presentar eventos que expliquen los efectos del equipo sin ocultar el registro de combate.
- Mantener legible el historial de combates anteriores.
- Añadir y ejecutar las pruebas de colección vacía/llena, desbloqueo, pelea nueva e histórica, errores y accesibilidad.

## Fuera de alcance

- Implementar habilidades o mascotas (pasos 10.7 y 10.8).
- Cambiar las reglas del catálogo, adquisición, desbloqueo, sorteo de carga o combate implementadas en 10.6.2.
- Permitir que la UI altere el combate o el inventario.
- Implementar tareas de cualquier otro paso de la hoja de ruta.

## Criterios de aceptación

- Colección y carga sorteada se distinguen.
- Eventos explican efectos sin ocultar el registro de combate.
- Historial anterior sigue legible.
- La UI no permite alterar combate ni inventario.

## Pruebas

- Colección vacía/llena.
- Desbloqueo.
- Pelea nueva e histórica.
- Errores.
- Accesibilidad.

## Dependencia

- 10.6.2.

## Al terminar

Informar resultados y detenerse. No iniciar ningún paso posterior.
