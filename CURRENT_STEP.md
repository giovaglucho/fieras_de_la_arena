# Paso activo de desarrollo

**Paso activo:** `10.4.3`
**Estado:** autorizado; pendiente de implementación
**Título:** Presentar selección y resultado del desafío

## Objetivo

Permitir que el jugador decida a quién desafiar sin quitar al servidor el control de elegibilidad, cupos y resultado.

## Tareas permitidas

- Explorar rivales elegibles, ver información pública suficiente, confirmar el personaje propio y el objetivo antes de iniciar; presentar cupos restantes y resultado automático.

## Fuera de alcance

- Iniciar cualquier paso posterior de ROADMAP.md.

## Criterios de aceptación

- Interfaz y servidor coinciden sobre luchador propio, rival y cupos; la UI no selecciona un oponente distinto al confirmado; las peleas siguen siendo automáticas; la opción de combatir no queda disponible al llegar al límite y errores de red no aparentan un combate exitoso.

## Pruebas/verificación

- Selección, confirmación, cupos, perfil privado, carga/error y presentación de historial.

## Dependencia

- 10.4.2.

## Al terminar

Informar resultados y detenerse. No iniciar 10.5 ni ningún otro paso posterior.
