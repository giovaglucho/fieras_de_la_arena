# Paso activo de desarrollo

**Paso activo:** `10.6.2`
**Estado:** autorizado; pendiente de implementación
**Título:** Implementar catálogo, desbloqueo y carga aleatoria

## Objetivo

Añadir variedad táctica a la simulación mediante objetos obtenidos por progresión y carga automática, sin exigir microtransacciones ni decisiones de combate en tiempo real.

## Tareas permitidas

- Implementar definiciones versionadas del catálogo del lado del servidor.
- Implementar la colección persistente de equipo.
- Implementar oportunidades de desbloqueo ligadas a creación/progresión según el diseño de 10.6.1.
- Implementar el sorteo reproducible de carga para combates.
- Implementar en el motor únicamente los efectos de equipo permitidos por el diseño de 10.6.1.
- Añadir y ejecutar las pruebas de catálogo inválido, propiedad, desbloqueo, pifia, crítico, efectos, semilla, transacción y snapshot legado.

## Fuera de alcance

- Implementar la UI de colección y la presentación de carga/equipamiento en el resultado e historial (paso 10.6.3).
- Implementar habilidades o mascotas (pasos 10.7 y 10.8).
- Implementar tareas de cualquier otro paso de la hoja de ruta.

## Criterios de aceptación

- Nadie puede obtener/equipar objetos enviando IDs arbitrarios.
- No hay desbloqueos duplicados por reintento.
- El equipo sorteado pertenece a la colección.
- Sin objetos se mantiene un combate válido.
- El versionado/snapshot permite reproducir peleas antiguas.

## Pruebas

- Catálogo inválido.
- Propiedad.
- Desbloqueo.
- Pifia.
- Crítico.
- Efectos.
- Semilla.
- Transacción.
- Snapshot legado.

## Dependencia

- 10.6.1.

## Al terminar

Informar resultados y detenerse. No iniciar 10.6.3 ni ningún otro paso posterior.
