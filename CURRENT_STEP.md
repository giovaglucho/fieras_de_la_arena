# Paso activo de desarrollo

**Paso activo:** `9.5`
**Estado:** completado
**Título:** Pulir navegación autenticada y presentación del combate

## Objetivo

Mejorar la orientación de las personas con sesión iniciada, simplificar el flujo posterior al registro, completar retornos contextuales necesarios y añadir una presentación visual básica de los combates guardados.

## Permitido en este paso

- Hacer que el inicio y el logo conduzcan a un destino adecuado según la sesión y el estado de creación del luchador.
- Actualizar el contrato de registro en la especificación para permitir el inicio automático de sesión; luego iniciar sesión tras un registro correcto y continuar al flujo correspondiente de creación del luchador.
- Añadir retornos contextuales solo donde la navegación actual no ofrezca una salida adecuada, especialmente en perfiles públicos y estados de error.
- Mostrar una animación visual básica de ambos luchadores basada en los eventos persistidos del combate.
- Mantener accesible el registro textual del combate y respetar la preferencia de movimiento reducido.
- Añadir o actualizar las pruebas y la documentación directamente relacionadas con estos cambios.

## Fuera de alcance

- No iniciar la etapa 10 ni implementar armas, equipo, habilidades, mascotas u otras funciones de expansión.
- No cambiar las reglas, los resultados, las recompensas ni la persistencia del motor de combate.
- No añadir enlaces o botones de navegación redundantes.

## Criterios de aceptación

- Una persona autenticada que usa el logo o visita el inicio llega a una pantalla útil, sin que la sesión se cierre ni se sugiera que debe volver a iniciar sesión.
- Tras un registro correcto, la cuenta queda autenticada y continúa al flujo de creación del luchador sin un login manual intermedio.
- La especificación documenta el nuevo contrato de registro antes de considerarlo completo.
- Las pantallas que carecen de un retorno contextual adecuado ofrecen una salida pertinente; no se agregan controles redundantes.
- El resultado de un combate guardado presenta visualmente a ambos luchadores y sus acciones a partir de los eventos persistidos; el registro textual permanece disponible.
- La animación no altera la resolución del combate y se reduce o desactiva según la preferencia de movimiento reducido.
- Las pruebas pertinentes pasan y se informa cualquier limitación externa.

## Al terminar

Informar los resultados y detenerse. No seleccionar ni implementar el paso siguiente automáticamente. El usuario decidirá cuándo continuar.
