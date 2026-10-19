# Paso activo de desarrollo

**Paso activo:** `3.2`
**Estado:** pendiente
**Título:** Crear el luchador mediante API

## Objetivo

Implementar la creación del luchador de una cuenta mediante la API, validando el nombre y asignando sus valores iniciales en el servidor, sin permitir que el cliente manipule sus estadísticas, ELO o nivel.

## Permitido en este paso

- Exigir sesión para crear un luchador.
- Validar el nombre en el servidor.
- Asignar los valores iniciales desde el servidor.
- No aceptar atributos, ELO o nivel libres del cliente.

## Fuera de alcance

- Crear el flujo visual de creación de luchador; corresponde al paso 3.3.
- Crear perfiles propios o públicos; corresponde al paso 3.4.
- Calcular estadísticas derivadas por nivel; corresponde al paso 3.5.
- Implementar tareas posteriores de la hoja de ruta.

## Criterios de aceptación

- Solo se crea un luchador por cuenta y no se pueden manipular estadísticas.

## Al terminar

Informar los resultados y detenerse. No seleccionar ni implementar el paso siguiente automáticamente. El usuario actualizará este archivo cuando decida continuar.
