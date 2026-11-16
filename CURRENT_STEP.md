# Paso activo de desarrollo

**Paso activo:** `11.0.2`
**Estado:** pendiente de iniciar; esperando la decisión del usuario
**Rama de trabajo:** `etapa-11`
**Título:** Especificación del motor 2.0

## Objetivo

Fijar en `PROJECT_SPEC.md` el motor de combate 2.0 con todas sus reglas, fórmulas y eventos, para que el paso 11.2.1 pueda implementarlo sin tomar decisiones de diseño.

## Tareas permitidas

- Definir el modelo de iniciativa y tempo, el orden de turnos y los desempates con semilla.
- Definir las tiradas de esquiva, bloqueo, contraataque, reversión, combo, crítico y desarme, con sus fórmulas y topes.
- Definir la fórmula de daño y la condición de KO.
- Definir el lanzamiento de armas y el cambio de arma durante el combate.
- Definir el tope de seguridad de turnos y la forma en que garantiza un ganador (sin empates).
- Enumerar los eventos del motor con sus campos.
- Definir los dominios aleatorios por semilla de combate.
- Escribir tablas de casos límite para cada regla.

## Fuera de alcance

- Cambiar código, modelos, rutas o pruebas.
- Definir catálogos de armas, habilidades o mascotas (paso 11.0.3). Las reglas del motor pueden referirse a sus campos, pero no fijar sus valores.
- Modificar `ROADMAP.md` salvo para marcar este paso como completado.
- Implementar cualquier otro paso de la hoja de ruta.

## Criterios de aceptación

- El motor puede implementarse solo con lo escrito en la especificación, sin decisiones adicionales.
- Cada fórmula tiene al menos un ejemplo numérico y un caso límite.
- Los eventos están enumerados con sus campos y su orden.
- No hay contradicciones con las secciones 4.1–4.7 y 4.9 ni con el modelo de la sección 6.3.
- Ningún valor queda como pendiente, salvo los de balance reservados para 11.8.1.

## Pruebas y verificación

- Revisión cruzada de la sección de motor con 4.1 (estadísticas), 4.4 (contrato del motor), 4.5 (XP) y 6.3 (`Battle`).
- Comprobación manual de los ejemplos numéricos con cálculos a mano.

## Dependencia

- 11.0.1 (completado en `e8585b7`).

## Flujo de trabajo de la etapa

1. Implementar solo este paso en la rama `etapa-11`.
2. Informar resultados y detenerse.
3. El usuario supervisa. Si lo aprueba, se commitea y pushea a `etapa-11`, y se activa el siguiente paso.

## Al terminar

Informar resultados y detenerse. No implementar los pasos posteriores.
