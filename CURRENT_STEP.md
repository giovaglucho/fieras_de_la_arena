# Paso activo de desarrollo

**Paso activo:** `10.8.3`
**Estado:** completado; QA aprobado e integrado en `master`
**Título:** Mostrar colección y participación de mascotas

## Objetivo

Permitir que los luchadores obtengan acompañantes originales que influyan de forma limitada y explícita en la simulación.

## Tareas permitidas

- Mostrar qué mascotas posee el luchador.
- Mostrar qué aportó su acompañante al combate.
- Conservar una pantalla normal cuando el luchador no tiene mascotas.
- Usar textos y recursos visuales propios.

## Fuera de alcance

- Implementar cualquier otro paso de la hoja de ruta.

## Correcciones puntuales de QA autorizadas

En esta iteración se autoriza además corregir únicamente estas incidencias reportadas en el QA:

- Evitar que el panel use rutas v1 singulares cuando la cuenta posee varios luchadores; debe mostrar los datos del luchador activo seleccionado usando la API v2.
- Servir un favicon válido para que `/favicon.ico` no responda 404.

No ampliar estos arreglos a otras inconsistencias de API o interfaz.

## Incidencia de despliegue autorizada

Se autoriza resolver, sin cambiar el ID del paso, el error de creación de varios luchadores en Render mediante un preflight y una migración versionada de los índices/actividades legados. La ejecución en producción requiere respaldo recuperable y escrituras pausadas; no autoriza reasignar, borrar ni fusionar luchadores o actividades ambiguas.

## Criterios de aceptación

- Se muestra qué mascotas posee el luchador y qué aportó su acompañante al combate.
- Sin mascotas se conserva una pantalla normal.
- Los textos y recursos visuales son propios.
- Una cuenta con varios luchadores puede cargar el panel del luchador activo sin errores 409.
- La solicitud de `/favicon.ico` responde correctamente con un recurso válido.
- La migración puede verificar previamente los índices y actividades sin escribir datos.
- La migración sustituye el índice único legado de `fighters.userId` y conserva las actividades diarias asociables de forma inequívoca.
- Las actividades legadas ambiguas se rechazan sin cambios para revisión explícita.

## Pruebas y verificación

- Vacío.
- Colección.
- Combate.
- Historial.
- Privacidad.
- Accesibilidad.
- Panel con varios luchadores.
- Recurso favicon.

## Dependencia

- 10.8.2.

## Al terminar

Informar resultados y detenerse. No iniciar ningún paso posterior.
