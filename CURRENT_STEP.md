# Paso activo de desarrollo

**Paso activo:** `11.0.3`
**Estado:** pendiente de iniciar; esperando la decisión del usuario
**Rama de trabajo:** `etapa-11`
**Título:** Catálogos originales

## Objetivo

Fijar en `PROJECT_SPEC.md` los catálogos de armas, habilidades, mascotas y refuerzos, con sus reglas de obtención y topes por nivel, usando solo los campos que define la sección 4.10, para que los pasos de implementación no tomen decisiones de diseño.

## Tareas permitidas

- Definir las armas: tipos, tempo, daño, rasgos, peso de aparición y tiers.
- Definir las habilidades: potenciadores de estadística, pasivas y súper con usos.
- Definir las mascotas y los refuerzos, con sus campos para el motor.
- Definir las reglas de obtención, elegibilidad, prerrequisitos, incompatibilidades y topes de tier por nivel.
- Renombrar y reajustar los elementos que coinciden con el original (4.9, principio de originalidad).
- Marcar como provisionales los valores de balance (11.8.1).
- Documentar interacciones y casos límite.

## Fuera de alcance

- Cambiar código, modelos, rutas o pruebas.
- Modificar las reglas del motor de 4.10 (si hace falta un campo nuevo, se señala, no se añade).
- Modificar `ROADMAP.md`.
- Implementar cualquier otro paso de la hoja de ruta.

## Criterios de aceptación

- Todo elemento tiene identificador estable, nombre y texto propios y reglas completas.
- Ningún nombre ni cifra coincide con el catálogo del remake.
- Las interacciones tienen casos límite documentados.
- Sin contradicciones con 4.1–4.7, 4.9 y 4.10.
- Ningún valor queda como pendiente, salvo los de balance reservados para 11.8.1.

## Pruebas y verificación

- Revisión cruzada con 4.1 (vida y perk inicial), 4.5 (opciones de subida de nivel) y 4.10 (campos de instantánea).
- Comprobación manual de los ejemplos numéricos.

## Dependencia

- 11.0.2 (completado en `6bb8fdf`).

## Flujo de trabajo de la etapa

1. Implementar solo este paso en la rama `etapa-11`.
2. Informar resultados y detenerse.
3. El usuario supervisa. Si lo aprueba, se commitea y pushea a `etapa-11`, y se activa el siguiente paso.

## Al terminar

Informar resultados y detenerse. No implementar los pasos posteriores.
