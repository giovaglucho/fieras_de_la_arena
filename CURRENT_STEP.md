# Paso activo de desarrollo

**Paso activo:** `11.0.1`
**Estado:** pendiente de implementar
**Rama de trabajo:** `etapa-11`
**Título:** Contrato de producto del rediseño

## Objetivo

Fijar los valores y reglas del producto rediseñado (sección 4.9 de `PROJECT_SPEC.md`) para que los pasos posteriores no necesiten tomar decisiones de diseño.

## Tareas permitidas

- Definir estadísticas iniciales y presupuesto de puntos, fórmula de vida y reparto aleatorio de creación.
- Definir la curva de XP, la XP por combate según la diferencia de nivel y las reglas de subida de nivel.
- Definir las dos opciones de subida de nivel, su elegibilidad, la sustitución cuando un perk no es elegible y la estructura del árbol de destino.
- Definir el límite de 3 luchadores por cuenta y la habilidad de regeneración (+2 combates).
- Definir el contrato de la API única y los modelos `Fighter`, `Battle` y `DailyActivity` sin ELO.
- Reescribir las secciones 4.1–4.7, 6 y 7 de `PROJECT_SPEC.md` para que describan solo el juego nuevo.

## Fuera de alcance

- Cambiar código, modelos, rutas o pruebas.
- Especificar el motor de combate (paso 11.0.2) o los catálogos (paso 11.0.3).
- Modificar `ROADMAP.md` salvo para marcar este paso como completado.
- Implementar cualquier otro paso de la hoja de ruta.

## Criterios de aceptación

- Ningún valor del contrato queda como «pendiente», salvo los de balance reservados para 11.8.1.
- No hay contradicciones con la sección 4.9.
- Cada regla incluye un ejemplo de caso límite.
- Las secciones reescritas no conservan reglas de ELO, defensa plana, un solo luchador por cuenta ni selección automática de rival, salvo como nota histórica explícita.

## Pruebas y verificación

- Revisión cruzada de las secciones 3, 4, 6, 7, 8 y 9 de `PROJECT_SPEC.md` para detectar reglas contradictorias.
- Revisión de que las rutas del contrato cubren todo el flujo: registro, creación, selección, arena, subida de nivel, historial y dojo.

## Dependencia

- Ninguna.

## Flujo de trabajo de la etapa

1. Implementar solo este paso en la rama `etapa-11`.
2. Informar resultados y detenerse.
3. El usuario supervisa. Si lo aprueba, se commitea y pushea a `etapa-11`, y se activa el siguiente paso.

## Al terminar

Informar resultados y detenerse. No implementar los pasos posteriores.
