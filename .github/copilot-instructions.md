# Instrucciones permanentes para GitHub Copilot

Este repositorio desarrolla **Fieras de la Arena**, un juego web MERN de combates automáticos. Antes de proponer o modificar código, leer `PROJECT_SPEC.md`, `ROADMAP.md` y `CURRENT_STEP.md`.

## Regla principal: una tarea, un paso

1. `CURRENT_STEP.md` es la única autoridad para saber qué tarea se puede implementar ahora.
2. Implementar únicamente el paso activo y sus criterios de aceptación.
3. No empezar tareas posteriores, aunque parezcan sencillas o necesarias para una futura función.
4. No añadir de antemano modelos, rutas, pantallas, dependencias, abstracciones o archivos para pasos futuros.
5. Al terminar, detenerse y presentar el resultado. Nunca pasar al siguiente paso automáticamente.
6. El usuario decide cuándo avanzar y cambia el ID activo en `CURRENT_STEP.md`.

## Antes de editar

- Inspeccionar el estado actual del repositorio y los archivos relacionados con la tarea.
- No asumir que el repositorio está vacío.
- Identificar qué archivos hay que modificar para satisfacer el paso activo y mantener el cambio acotado.
- Si el paso es ambiguo, contradice la especificación o requiere una decisión de producto, detenerse y explicar el bloqueo antes de hacer cambios amplios.
- No borrar ni reescribir archivos existentes para simplificar el trabajo.

## Durante la implementación

- Mantener el código sencillo, legible y apropiado para una persona que está aprendiendo.
- Preferir JavaScript y las herramientas ya elegidas en la especificación; no migrar a TypeScript sin autorización explícita.
- No añadir paquetes si la funcionalidad se resuelve razonablemente con el stack existente.
- No duplicar reglas de negocio.
- La lógica de combate, XP, nivel, ELO, selección de oponentes y recompensas vive en el servidor, nunca solo en React.
- Validar en el backend toda entrada del cliente y comprobar autorización en el servidor.
- No guardar secretos en código ni en Git. No imprimir cookies, contraseñas, hashes o secretos en logs.
- No inventar resultados de comandos ni afirmar que una prueba pasó si no fue ejecutada.
- No esconder errores con `catch` vacíos, valores ficticios o datos simulados presentados como reales.
- No hacer refactors no relacionados con la tarea activa.

## Pruebas y finalización

- Ejecutar las comprobaciones y pruebas pertinentes al paso activo.
- Corregir solamente los problemas necesarios para satisfacer sus criterios.
- Si una prueba falla por una causa externa (por ejemplo, MongoDB no está disponible), informar el comando, resultado y bloqueo real; no declarar la tarea aprobada.
- Resumir: objetivo, archivos cambiados, comandos ejecutados, resultados, limitaciones y criterio pendiente si lo hubiera.
- Marcar como completado únicamente el paso activo si se verificaron sus criterios.
- No cambiar el ID de `CURRENT_STEP.md` al siguiente paso. Esperar la decisión explícita del usuario.

## Respeto a la especificación

- `PROJECT_SPEC.md` define producto, reglas y arquitectura.
- `ROADMAP.md` define el orden general, pero no autoriza a ejecutar sus próximos pasos.
- `CURRENT_STEP.md` define el alcance permitido ahora.
- Si se necesita cambiar un requisito, describir primero el motivo y proponer la actualización documental; no alterar silenciosamente reglas de juego, API, modelo de datos o alcance.
- Si aparece una funcionalidad nueva durante el desarrollo, anotarla como propuesta para evaluar después, no implementarla de inmediato.

## Formato de respuesta al usuario

Responder en español claro. Antes de una tarea de varias partes, explicar brevemente qué se comprobará. Al terminar una tarea, informar resultados verificables y dar una sola recomendación del siguiente paso posible, sin ejecutarlo.
