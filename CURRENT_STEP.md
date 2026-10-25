# Paso activo de desarrollo

**Paso activo:** `10.4.1`
**Estado:** autorizado; pendiente de implementación
**Título:** Definir catálogo público y reglas de desafío

## Objetivo

Permitir que el jugador decida a quién desafiar sin quitar al servidor el control de elegibilidad, cupos y resultado.

## Tareas permitidas

- Definir qué información de personajes públicos se lista; qué ocultará un perfil privado; filtros/búsqueda, criterios de elegibilidad, rango de nivel/ELO, exclusión del propio dueño, inactividad, repetición de rival, límites contra abuso y alternativa cuando no haya rivales.

## Fuera de alcance

- Implementar endpoints, servicios, reservas de cupos, idempotencia o recuperación de desafíos correspondientes a 10.4.2.
- Implementar la exploración de rivales, confirmación de desafíos, presentación de cupos o resultados correspondientes a 10.4.3.
- Modificar la aplicación, los modelos, la API, los datos o el despliegue; este paso se limita a definir reglas y documentación.
- Contradecir o cambiar silenciosamente las reglas aprobadas en `PROJECT_SPEC.md`.

## Criterios de aceptación

- La selección pertenece al jugador; el servidor valida cada objetivo y la privacidad antes de aceptar el desafío; no se revela información privada; los bots o rivales de entrenamiento quedan claramente diferenciados y no generan ELO si así continúa el contrato aprobado.

## Pruebas/verificación

- Tabla de visibilidad y elegibilidad, solicitudes a objetivo propio/privado/inexistente y revisión de consistencia con ranking e historial.

## Dependencia

- 10.1.1 y 10.2.2.

## Al terminar

Informar resultados y detenerse. No iniciar 10.4.2, 10.4.3 ni ningún otro paso posterior.
