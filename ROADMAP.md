# Fieras de la Arena — Hoja de ruta incremental

Esta hoja ordena el desarrollo desde cero hasta una versión publicable. **No se deben ejecutar varias tareas por comodidad.** Cada ID es una unidad independiente. La tarea autorizada en cada momento está en `CURRENT_STEP.md`.

## Cómo usar esta hoja

1. Trabajar únicamente el ID activo que aparece en `CURRENT_STEP.md`.
2. Revisar criterios de aceptación y ejecutar las comprobaciones de ese paso.
3. Si falla algo, corregir solo el paso activo y volver a verificarlo.
4. Al terminar, informar resultados y detenerse. El usuario decide cuándo avanzar y actualiza manualmente el ID activo.
5. No crear anticipadamente archivos para funcionalidades de etapas posteriores.

---

## Etapa 0 — Preparación del entorno

### 0.1 Verificar entorno y estado del repositorio
- Comprobar Node.js, npm y Git instalados.
- Inspeccionar el repositorio existente antes de crear o sobrescribir archivos.
- Confirmar que los documentos de proyecto están en la raíz.
- No cambiar lógica de aplicación.
- **Aceptación:** versiones y estado del repo informados; sin archivos existentes sobrescritos.

### 0.2 Preparar repositorio y reglas de trabajo
- Crear/confirmar `.gitignore` y estructura inicial de documentación.
- Verificar que `.env` y `node_modules` estén ignorados.
- **Aceptación:** archivos de base correctos y primer commit disponible si el usuario decide realizarlo.

## Etapa 1 — Esqueleto ejecutable

### 1.1 Crear el cliente React con Vite
- Crear `client/` con React + Vite + JavaScript.
- Dejar la pantalla predeterminada mínima, sin sistema de juego.
- Instalar dependencias y comprobar que el cliente inicia.
- No crear el backend ni instalar bibliotecas para funciones futuras.
- **Aceptación:** `npm run dev` dentro de `client` arranca sin errores y la página se ve en el navegador.

### 1.2 Crear el servidor Express mínimo
- Crear `server/` con Node.js, Express y módulos ES.
- Crear `GET /api/v1/health` con respuesta JSON simple.
- Agregar manejo básico de errores y comando de desarrollo.
- No conectar MongoDB ni implementar autenticación todavía.
- **Aceptación:** servidor arranca y health devuelve HTTP 200.

### 1.3 Documentar ejecución local y variables
- Añadir `.env.example`, configurar variables sin secretos reales y completar instrucciones para arrancar client/server.
- Añadir `.gitignore` necesario.
- **Aceptación:** los pasos documentados coinciden con los comandos reales; ningún secreto queda versionado.

### 1.4 Conectar MongoDB con Mongoose
- Añadir configuración y conexión a MongoDB.
- Hacer que el servidor indique claramente si conecta o falla.
- Añadir al endpoint de salud el estado de la base de datos.
- **Aceptación:** conexión local probada; error de conexión controlado y comprensible.

### 1.5 Añadir formato común de errores y validación base
- Definir una respuesta de error consistente y middleware final.
- Introducir una librería de validación solo si hace falta para el primer endpoint que la use.
- **Aceptación:** errores conocidos devuelven código HTTP y cuerpo coherentes; no se muestran trazas internas.

## Etapa 2 — Cuentas y sesión

### 2.1 Crear modelo User e índices
- Modelo con username/email normalizados, hash de contraseña, estado, rol y relación de invitación opcional.
- Añadir índices únicos.
- **Aceptación:** modelo y restricciones probados contra MongoDB.

### 2.2 Implementar registro
- Validar datos en servidor, normalizar valores y hashear contraseña.
- Manejar duplicados con error público consistente.
- El contrato inicial no inicia sesión automáticamente; cualquier cambio posterior debe actualizar explícitamente la especificación y sus pruebas (definido en el paso 9.5).
- **Aceptación:** registro válido funciona; inválidos y duplicados se rechazan; nunca se devuelve el hash.

### 2.3 Implementar login, logout y sesión persistente
- Configurar sesiones almacenadas en MongoDB y cookie segura según entorno.
- Regenerar sesión al login y destruirla al logout.
- **Aceptación:** sesión funciona al recargar y logout la invalida.

### 2.4 Implementar `GET /auth/me` y middleware de autenticación
- Definir respuesta de usuario público sin campos sensibles.
- Proteger una ruta de prueba.
- **Aceptación:** anónimo obtiene 401; autenticado obtiene solo sus datos permitidos.

### 2.5 Crear pantallas de registro y login
- Formularios, validación visible, carga y mensajes de error.
- Conectar con la API existente.
- **Aceptación:** el recorrido funciona en navegador; el backend sigue siendo la autoridad.

### 2.6 Integrar estado de sesión y rutas protegidas
- Contexto React sencillo para sesión.
- Resolver recarga, login y logout.
- **Aceptación:** rutas protegidas se comportan según el estado real de la sesión; no basta con ocultar enlaces.

## Etapa 3 — Crear y consultar luchadores

### 3.1 Crear modelo Fighter e índices
- Una relación única por usuario, nombre normalizado único, nivel, XP, ELO, estadísticas base, contadores y código de invitación.
- **Aceptación:** no se puede vincular más de un luchador a la misma cuenta.

### 3.2 Crear el luchador mediante API
- Exigir sesión; validar nombre; asignar valores iniciales desde el servidor.
- No aceptar atributos, ELO o nivel libres del cliente.
- **Aceptación:** solo se crea un luchador por cuenta y no se pueden manipular estadísticas.

### 3.3 Crear flujo visual de creación
- Pantalla solo para cuentas sin luchador.
- Mostrar errores de nombre y confirmar creación.
- **Aceptación:** formulario completo y estado consistente tras recargar.

### 3.4 Crear perfil propio y perfil público
- Endpoints con lista explícita de campos públicos.
- Página de resumen básico del luchador.
- **Aceptación:** no se filtran correo ni datos privados; IDs inexistentes devuelven 404.

### 3.5 Calcular estadísticas derivadas por nivel
- Centralizar la fórmula inicial de vida, ataque, defensa y velocidad en el servidor.
- Añadir pruebas unitarias de valores representativos.
- **Aceptación:** la misma entrada produce siempre las mismas estadísticas.

## Etapa 4 — Núcleo del combate

### 4.1 Definir contratos de dominio del motor
- Tipos/estructuras de entrada, instantáneas, eventos y resultado documentados en JavaScript.
- Añadir `engineVersion`.
- **Aceptación:** el contrato distingue entrada, eventos y resumen sin depender de HTTP o Mongoose.

### 4.2 Implementar simulación determinista
- Semilla proporcionada, orden de actuación, daño y condición de finalización.
- **Aceptación:** misma entrada + misma semilla da mismo resultado y eventos.

### 4.3 Probar motor y límites
- Añadir pruebas para daño mínimo, orden de turno, fin por KO, máximo de acciones y empates.
- **Aceptación:** suite del motor pasa sin conectar a base de datos.

### 4.4 Implementar cálculo de XP, nivel y ELO como funciones puras
- Fórmulas centralizadas y pruebas para victoria/derrota/empate, subida de varios niveles y entrenamiento.
- **Aceptación:** no hay reglas de progresión duplicadas en controladores ni frontend.

### 4.5 Crear modelo Battle e historial persistente
- Guardar instantáneas, eventos, semilla, versión y resultados.
- **Aceptación:** se puede reconstruir una pelea previa aunque cambie el luchador.

### 4.6 Implementar caso de uso de combate
- Servicio coordina validaciones, motor, persistencia y recompensas.
- Añadir mecanismo de idempotencia.
- **Aceptación:** un mismo request no duplica pelea ni recompensa; fallos no aparentan una victoria.

## Etapa 5 — Arena, límite diario y matchmaking

### 5.1 Implementar DailyActivity y reserva atómica
- Límite inicial de tres intentos en UTC.
- Índice único usuario+fecha y actualización segura ante peticiones concurrentes.
- **Aceptación:** dos solicitudes simultáneas no exceden el límite.

### 5.2 Implementar selección de rival
- Buscar oponente distinto y razonablemente cercano en ELO.
- Ampliar el rango progresivamente según configuración.
- **Aceptación:** nunca se selecciona al propio luchador y la búsqueda termina de manera controlada.

### 5.3 Añadir rival de entrenamiento de respaldo
- Usarlo únicamente si no se encuentra rival real según las reglas acordadas.
- Recompensa baja y sin cambio de ELO.
- **Aceptación:** pelea identificada como entrenamiento y excluida de la clasificación competitiva.

### 5.4 Exponer endpoints de arena e historial
- Consultar intentos restantes, iniciar combate y listar historial con paginación.
- **Aceptación:** validación, autorización, límite diario e idempotencia comprobados con pruebas API.

### 5.5 Crear pantalla Arena
- Mostrar intentos restantes y un botón que inicie la pelea.
- Controlar doble clic, espera, error y confirmación.
- **Aceptación:** el estado visual coincide con la respuesta del servidor y no se inventan resultados.

### 5.6 Crear pantalla de resultado y eventos
- Mostrar rival, resultado, XP, cambio ELO y secuencia de acciones.
- **Aceptación:** refleja el registro persistido; recargar la página no cambia el resultado.

### 5.7 Crear historial de combates
- Lista paginada y acceso al detalle.
- **Aceptación:** registros del jugador correcto, orden consistente y estados vacío/carga/error.

## Etapa 6 — Clasificación y perfiles completos

### 6.1 Crear endpoint de clasificación
- Clasificación por ELO y nivel; ordenar y paginar desde servidor.
- **Aceptación:** empates de orden resueltos de forma consistente y parámetros limitados.

### 6.2 Crear interfaz de clasificación
- Cambiar categoría y navegar páginas.
- Enlaces a perfiles públicos.
- **Aceptación:** se muestra información pública y el orden coincide con el servidor.

### 6.3 Completar dashboard del jugador
- Nivel, XP siguiente, estadísticas, ELO, últimos combates e intentos diarios.
- **Aceptación:** todos los valores vienen de API y hay estados de carga/error.

## Etapa 7 — Alumnos e invitaciones

### 7.1 Crear generación y consulta de código de invitación
- Un código único por luchador y endpoint autenticado.
- **Aceptación:** códigos no duplicados y no editables mediante entrada de usuario.

### 7.2 Aceptar invitación durante el registro
- Validar código; registrar referente una única vez.
- Prevenir referencias propias y ciclos triviales.
- **Aceptación:** cuenta nueva se vincula correctamente y no puede cambiar de referente.

### 7.3 Crear sección de alumnos
- Mostrar enlace copiable y lista/resumen de cuentas referidas según privacidad definida.
- **Aceptación:** no se exponen correos u otros datos privados de alumnos.

### 7.4 Añadir clasificación de alumnos
- Exponer la clasificación por conteo confirmado de alumnos.
- **Aceptación:** la fuente del conteo es consistente y no depende de valores manipulables del cliente.

## Etapa 8 — Robustez y seguridad

### 8.1 Añadir límites de peticiones
- Registro, login, creación de peleas y consultas sensibles.
- **Aceptación:** exceso devuelve 429 y no deja el estado parcial inconsistente.

### 8.2 Revisar cabeceras, CORS y configuración de sesión
- Configurar Helmet y orígenes/cookies según modo local o producción.
- **Aceptación:** cliente autorizado funciona; orígenes ajenos no se habilitan sin motivo.

### 8.3 Revisar validación, filtrado y autorización
- Probar payloads manipulados, IDs inválidos y campos no permitidos.
- **Aceptación:** operaciones sensibles solo aceptan las propiedades esperadas.

### 8.4 Añadir logs operativos seguros
- Errores con contexto útil sin credenciales, cookies ni secretos.
- **Aceptación:** fallos investigables sin filtrar datos sensibles.

### 8.5 Ejecutar pruebas integradas de flujos completos
- Registro → creación → combate → resultado → historial → clasificación.
- Probar dos cuentas diferentes.
- **Aceptación:** recorrido completo verificado con resultados registrados.

### 8.6 Revisar accesibilidad y diseño adaptable
- Teclado, etiquetas, foco, contraste, pantallas pequeñas y estados de error.
- **Aceptación:** no hay bloqueos visuales en los tamaños de pantalla probados.

## Etapa 9 — Preparar versión 1.0

### 9.1 Revisar dependencias y scripts
- Retirar dependencias realmente no usadas y verificar scripts de producción.
- **Aceptación:** instalación reproducible desde un repositorio limpio.

### 9.2 Completar documentación para desarrolladores
- Instalación, variables, estructura, pruebas, comandos y solución de problemas frecuentes.
- **Aceptación:** una persona puede levantar el proyecto siguiendo únicamente la documentación.

### 9.3 Preparar despliegue de prueba
- Elegir proveedor, variables, MongoDB y dominio solo cuando el usuario lo apruebe.
- Configurar HTTPS y health check.
- **Aceptación:** build y arranque de producción comprobados sin secretos en Git.

### 9.4 Verificación final de lanzamiento
- Probar registro, login/logout, creación, combate, recompensas, historial, perfiles y ranking en entorno publicado.
- **Aceptación:** checklist aprobado; fallos críticos resueltos o documentados antes de anunciar el juego.

### 9.5 Pulir navegación autenticada y presentación del combate
- Hacer que el inicio y el logo orienten correctamente a las personas con sesión iniciada, sin confundir la navegación con un cierre de sesión.
- Actualizar el contrato de registro en la especificación para permitir el inicio automático de sesión; luego iniciar sesión tras un registro correcto y continuar al flujo correspondiente de creación del luchador.
- Añadir únicamente los retornos contextuales que falten en perfiles públicos y estados de error.
- Presentar una animación visual básica de ambos luchadores a partir de los eventos persistidos del combate, conservando el registro textual y respetando la preferencia de movimiento reducido.
- No modificar las reglas, resultados ni recompensas del motor de combate.
- **Aceptación:** la especificación documenta el nuevo contrato de registro; navegación coherente para personas autenticadas y anónimas; registro continúa con una sesión autenticada; retornos contextuales disponibles donde sean necesarios; resultado muestra la animación del combate guardado y el texto sigue accesible; pruebas pertinentes pasan.

## Etapa 10 — Expansión de juego (después de validar v1.0)

Cada sistema debe dividirse en tareas específicas antes de empezar. No comenzar esta etapa hasta dar por terminada y probada la versión 1.0.

### 10.1 Armas y equipo
- Inventario, definiciones de objetos, equipo activo, balance y pruebas.

### 10.2 Habilidades
- Definiciones versionadas, condiciones de activación, resolución segura en el motor y pruebas.

### 10.3 Mascotas
- Colección, estadísticas, desbloqueo y reglas de combate.

### 10.4 Elecciones de progresión
- Alternativa a las estadísticas automáticas; migración del progreso existente y balance.

### 10.5 Logros, misiones y temporadas
- Objetivos, recompensas no explotables, reinicios de temporada y clasificación histórica.

### 10.6 Herramientas administrativas y moderación
- Roles, controles mínimos, auditoría, reportes y acciones reversibles.

---

## Plantilla para una tarea individual

Antes de ejecutar cualquier ID, completar mentalmente o dejar en el plan de trabajo:

- **ID y objetivo:** una sola capacidad.
- **Archivos permitidos:** lista acotada de archivos que pueden crearse o modificarse.
- **Fuera de alcance:** el siguiente paso y cualquier función no necesaria.
- **Criterios de aceptación:** resultados observables.
- **Pruebas:** comandos y verificaciones concretas.
- **Resultado:** aprobado, bloqueado o necesita corrección.

Si el paso requiere más trabajo del razonable para una sola iteración, dividirlo en subpasos antes de modificar archivos y pedir al usuario que elija el siguiente paso.
