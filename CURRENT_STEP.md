# Paso activo de desarrollo

**Paso activo:** `10.6.1`
**Estado:** autorizado; pendiente de implementación
**Título:** Diseñar catálogo, propiedad, equipamiento y efectos

## Objetivo

Añadir variedad táctica a la simulación mediante objetos obtenidos por progresión y carga automática, sin exigir microtransacciones ni decisiones de combate en tiempo real.

## Tareas permitidas

- Definir tipos y espacios de equipo.
- Definir el tamaño inicial de un catálogo original.
- Definir la obtención aleatoria al crear y subir de nivel.
- Definir la colección permanente.
- Definir el sorteo automático por combate.
- Definir duplicados, modificadores, efectos especiales, golpe crítico y fallo crítico.
- Definir límites y orden de resolución.
- Revisar combinaciones, casos sin equipo, colección parcial/completa, duplicados y replay de combate.

## Fuera de alcance

- Implementar el catálogo, los desbloqueos, la carga aleatoria o los efectos en el servidor (paso 10.6.2).
- Implementar la colección o presentar equipamiento y resultados en la interfaz (paso 10.6.3).
- Implementar tareas ajenas al diseño autorizado de 10.6.1.

## Criterios de aceptación

- Cada objeto tiene identidad y valores propios.
- Queda claro qué se guarda, qué se sortea al combatir y qué snapshot se registra.
- Crítico y pifia son resultados distintos.
- Los ejemplos de efectos no son valores definitivos hasta aprobar balance.

## Pruebas y verificación

- Revisar combinaciones, sin equipo, colección parcial/completa, duplicado y replay de combate.

## Dependencia

- Reglas de 10.1 y motor de 10.5.2.

## Al terminar

Informar resultados y detenerse. No iniciar 10.6.2 ni ningún otro paso posterior.
