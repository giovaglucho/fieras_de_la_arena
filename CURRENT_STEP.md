# Paso activo de desarrollo

**Paso activo:** `10.7.1`
**Estado:** autorizado; pendiente de diseño
**Título:** Definir catálogo y condiciones

## Objetivo

Incorporar técnicas propias que se desbloquean por progresión y se resuelven como parte de la simulación automática.

## Tareas permitidas

- Definir categorías pasivas/activas, condiciones de disparo, frecuencia, objetivos, duración, acumulación, interacción con equipo/mascotas, asignación inicial aleatoria, desbloqueo aleatorio al progresar y contrajuego.
- Documentar el diseño en la especificación y documentación directamente relacionada, sin implementar código de aplicación.

## Fuera de alcance

- Implementar habilidades versionadas y reproducibles (10.7.2).
- Presentar habilidades y sus activaciones en la interfaz (10.7.3).
- Diseñar o implementar el sistema de mascotas (10.8), salvo especificar los puntos de interacción necesarios dentro del diseño de habilidades.
- Implementar cualquier tarea de otro paso de la hoja de ruta.

## Criterios de aceptación

- No hay activaciones ilimitadas, ciclos infinitos ni reglas ambiguas; las condiciones son evaluables por el servidor; catálogo y textos son originales.

## Pruebas y verificación

- Tabla de condiciones/efectos y análisis de extremos.

## Dependencia

- 10.1.1 y modelo de evento de 10.6.

## Al terminar

Informar resultados y detenerse. No iniciar ningún paso posterior.
