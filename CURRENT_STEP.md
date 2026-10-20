# Paso activo de desarrollo

**Paso activo:** `10.1.1`
**Estado:** autorizado; pendiente de implementación
**Título:** Convertir la visión en reglas de juego propias

## Objetivo

Resolver las diferencias entre la visión ampliada y las reglas actuales antes de cambiar datos o comportamiento. `PROJECT_SPEC.md` es el contrato final del producto; se actualiza aquí, no se fuerza el diseño nuevo a encajar en las limitaciones del MVP.

## Tareas permitidas

- Definir el ciclo de vida de varios luchadores por cuenta; cantidad permitida y defensas contra creación automatizada; nombres únicos y selección del luchador activo; visibilidad pública predeterminada y estados privados; qué significa desafiar a un luchador; gestión de desafíos repetidos, inactivos o fuera de rango; cupos diarios por luchador y zona horaria; regla especial del día de creación; generación de atributos iniciales; estadísticas que pueden aumentar al subir de nivel; posibilidad y frecuencia de desbloquear armas, habilidades y mascotas tanto en la creación como al progresar; reglas iniciales de equipamiento aleatorio; relaciones de dojo/aprendiz y recompensas; límites y casos de abuso.
- Actualizar `PROJECT_SPEC.md` y esta sección de `ROADMAP.md`.
- Revisar las secciones de alcance, experiencia, combate, progresión, modelos y API de `PROJECT_SPEC.md`; comprobar que ningún contrato vigente contradice silenciosamente la nueva visión y que cada decisión tiene ejemplos de casos límite.

## Fuera de alcance

- Decidir valores de balance mediante código o empezar la implementación antes de resolver las reglas contradictorias.
- Modificar modelos, API, aplicación o configuración del despliegue.
- Implementar reglas de juego o migrar datos; este paso es de diseño y documentación.
- Saltar a 10.1.2 u otras tareas posteriores.

## Criterios de aceptación

- La especificación reemplaza expresamente, donde corresponda, las reglas de un luchador por cuenta, cupos por cuenta y selección automática de rival; refleja la intención de varios personajes sin límite de juego arbitrario, personajes públicos por defecto y desafíos elegidos por el jugador; resuelve el valor final de cupos tomando como opciones 3 o 5 diarios y la excepción de 6 el día de creación; distingue reglas aprobadas de valores pendientes; explica cómo se representa aleatoriedad de forma reproducible; define qué atributos, equipo, habilidades y mascotas pueden asignarse inicialmente y al progresar; conserva las reglas que no cambian; concreta privacidad sin reutilizar contraseñas de cuenta como contraseña de personaje; documenta controles contra abuso, duplicación de recompensas y desafíos repetidos.

## Pruebas/verificación

- Revisión cruzada de las secciones de alcance, experiencia, combate, progresión, modelos y API de `PROJECT_SPEC.md`; comprobar que ningún contrato vigente contradice silenciosamente la nueva visión y que cada decisión tiene ejemplos de casos límite.

## Dependencia

- Ninguna. Es requisito para todos los demás pasos de la etapa.

## Al terminar

Informar resultados y detenerse. No activar ni implementar 10.1.2 automáticamente. El usuario decidirá cuándo continuar y actualizará el ID activo.
