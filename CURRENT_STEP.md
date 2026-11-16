# Paso activo de desarrollo

**Paso activo:** `10.9.1`
**Estado:** completado; diseño documentado
**Título:** Definir reglas de dojo y recompensas

## Objetivo

Convertir las invitaciones existentes en una función social/progresiva de reclutamiento que no permita cuentas propias ni recompensas abusables.

## Tareas permitidas

- Decidir si el dojo pertenece a una cuenta o luchador.
- Definir la asociación de aprendices, invitaciones, límites, salida/transferencia, visibilidad, clasificación y recompensas.
- Coordinar las reglas con `referredByUserId` y los códigos actuales.
- Documentar el comportamiento actual de invitaciones.

## Fuera de alcance

- Implementar relaciones, consultas o acciones del dojo (paso 10.9.2).
- Presentar el dojo y los aprendices en la interfaz (paso 10.9.3).
- Otorgar nuevas recompensas antes de aprobar este diseño.
- Implementar cualquier otro paso de la hoja de ruta.

## Criterios de aceptación

- La relación es inequívoca, no se puede reclutar a uno mismo ni cambiar retroactivamente de maestro para obtener premios, y toda recompensa (si se aprueba) tiene condiciones medibles y resistentes a abuso; el comportamiento actual de invitaciones se documenta.

## Pruebas y verificación

- Escenarios de registro referido existente.
- Invitación repetida.
- Cuenta propia.
- Aprendiz inactivo.
- Recompensa duplicada.

## Dependencia

- 10.1.1.
- No otorgar nuevas recompensas antes de aprobar este diseño.

## Al terminar

Informar resultados y detenerse. No implementar los pasos posteriores.
