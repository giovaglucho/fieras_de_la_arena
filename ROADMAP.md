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

## Etapa 10 — Construir el ciclo ampliado de luchadores y arena

Esta etapa amplía el MVP hacia un juego de personajes coleccionables y combates automáticos: cada cuenta puede gestionar varios luchadores; cada luchador evoluciona mediante reglas parcialmente aleatorias; el jugador decide a quién desafiar; y los sistemas de equipo, habilidades, mascotas y dojo dan variedad a la progresión.

La inspiración en *El Bruto* se limita a ideas generales de diseño y al ciclo de juego explicado por el usuario. Fieras de la Arena tendrá nombres, reglas, probabilidades, estadísticas, personajes, textos, arte, interfaz y presentación propios. No se copiarán código, recursos ni expresiones creativas. Este roadmap define trabajo futuro; no autoriza a saltarse el paso activo de `CURRENT_STEP.md`.

### Principios y compatibilidad de toda la etapa

- El servidor es la autoridad para propiedad de luchadores, privacidad, estadísticas, selección de rival, cupos, progresión, desbloqueos, equipo, habilidades, mascotas, combate, XP y recompensas. El cliente solo solicita acciones válidas y representa la respuesta.
- Los combates siguen siendo automáticos: el jugador elige y prepara al luchador y el rival, pero no controla cada acción durante la simulación.
- Todo sorteo que afecte creación, progresión o combate se valida en el servidor; cuando intervenga en un combate, debe poder reproducirse con semilla y versión de reglas guardadas.
- El historial de combates es inmutable y debe seguir siendo legible con la versión de reglas y los snapshots que se usaron en su momento.
- Las cuentas y luchadores existentes siguen utilizables. Los datos previos no se borran ni se reinician; las relaciones actuales de usuario, luchador e invitación se conservan o se migran de manera explícita, idempotente, recuperable y probada.
- No se aplican migraciones a producción ni se despliegan cambios de esta etapa sin un paso activo que lo autorice y una estrategia de recuperación.
- Decisiones todavía abiertas —porcentajes, rangos, cantidad de opciones, cuotas exactas, límites de creación, recompensas y condiciones de privacidad— se fijan en la tarea de diseño antes de programarlas. No son reglas definitivas por aparecer como ejemplos en este plan.
- Cada subtarea hereda el objetivo del sistema padre, pero solo puede implementar su propio alcance; no incluye por defecto las subtareas hermanas o posteriores. En diseño se modifican únicamente especificación y documentación. En trabajo de servidor se limitan los cambios a dominio/modelos/rutas/servicios del sistema activo y pruebas del servidor; en interfaz, a sus componentes/estilos/cliente API y pruebas. Toda excepción de archivos, migración o despliegue debe quedar autorizada en el paso activo antes de ejecutarse.

### 10.1 Definir el nuevo contrato de producto y su compatibilidad

**Objetivo:** resolver las diferencias entre la visión ampliada y las reglas actuales antes de cambiar datos o comportamiento. `PROJECT_SPEC.md` es el contrato final del producto; se actualiza aquí, no se fuerza el diseño nuevo a encajar en las limitaciones del MVP.

#### 10.1.1 — Convertir la visión en reglas de juego propias

- **Alcance:** definir el ciclo de vida de varios luchadores por cuenta, sin máximo de juego arbitrario y con límites técnicos configurables contra automatización. Establecer nombres únicos, selección del luchador activo, privacidad pública predeterminada y desafíos dirigidos por el jugador; rechazos para luchadores privados como rival, suspendidos, repetidos o fuera de rango; cupos por luchador iniciador de 5 desafíos diarios y 6 en la fecha UTC de creación; generación reproducible de atributos iniciales, progresión y desbloqueos; reglas de equipo inicial, dojo/aprendices, recompensas y abuso. Los porcentajes, rangos y magnitudes que dependan de balance quedan identificados como pendientes, no se infieren de ejemplos.
- **Archivos permitidos:** `PROJECT_SPEC.md` y esta sección de `ROADMAP.md`. No modificar modelos, API, aplicación o configuración del despliegue.
- **Fuera de alcance:** decidir valores de balance mediante código o empezar la implementación antes de resolver las reglas contradictorias.
- **Aceptación:** la especificación sustituye expresamente para la expansión las reglas MVP de un luchador por cuenta, cupos por cuenta y selección automática; permite tantos luchadores por cuenta como se necesiten con controles técnicos; define luchadores públicos por defecto, estados privados, selección activa y desafíos elegidos por el jugador, con casos de privacidad, inactividad, repetición y rango fuera de ±200 ELO. Fija que los luchadores privados no pueden ser elegidos como rivales, aunque su dueño autenticado pueda usarlos para iniciar desafíos; solo el luchador iniciador consume su cupo y los combates con participantes privados no aparecen en consultas públicas. Fija 5 desafíos iniciados por luchador y día UTC y 6 en su fecha UTC de creación; distingue reglas aprobadas de valores de balance pendientes; describe semillas y versiones para reproducir sorteos; define estadísticas, equipo, habilidades y mascotas posibles al crear y al progresar (incluyendo un arma inicial aleatoria equipada, sin armadura, habilidad ni mascota); liga las claves idempotentes a una petición sin permitir que una clave repetida con datos distintos devuelva otro resultado; concreta la relación de dojo y sus recompensas sin ventaja competitiva, separada de las invitaciones asociadas a cuentas; conserva reglas MVP no sustituidas y documenta autorización, límites e idempotencia contra abuso y recompensas duplicadas. No introduce contraseñas de personaje.
- **Pruebas/verificación:** revisión cruzada de las secciones de alcance, experiencia, combate, progresión, modelos y API de `PROJECT_SPEC.md`; comprobar que ningún contrato vigente contradice silenciosamente la nueva visión y que cada decisión tiene ejemplos de casos límite.
- **Dependencia:** ninguna. Es requisito para todos los demás pasos de la etapa.

#### 10.1.2 — Definir el plan de datos, API y transición de cuentas

- **Alcance:** especificar cómo una cuenta se relaciona con múltiples luchadores; cómo se identifica dueño y visibilidad; cómo se consultan y seleccionan personajes propios y rivales públicos; qué campos nuevos son opcionales para datos existentes; unicidad de nombres/códigos; estrategia de índices, migración, rollback/recuperación y versionado de snapshots de combate.
- **Archivos permitidos:** `PROJECT_SPEC.md` y documentación técnica directamente relacionada.
- **Fuera de alcance:** ejecutar migraciones, crear endpoints o cambiar la base de datos productiva.
- **Aceptación:** se conserva el luchador actual de cada cuenta como personaje válido y propiedad del mismo usuario; la transición no pierde nivel, XP, ELO, estadísticas, invitaciones ni historial; cada acceso a personaje comprueba autorización del lado del servidor; cualquier migración necesaria está documentada con precondiciones, idempotencia, respaldo, verificación posterior y recuperación.
- **Pruebas/verificación:** revisar escenarios de cuenta antigua con un luchador, cuenta nueva sin luchador, cuenta con varios, nombres en conflicto, perfil privado y replay antiguo; confirmar que no se necesita una migración masiva si un esquema compatible lo resuelve.
- **Dependencia:** 10.1.1.

### 10.2 Permitir varios luchadores por cuenta

**Objetivo:** eliminar el supuesto de un único luchador por cuenta y dar a cada persona un conjunto persistente de personajes que pueda administrar.

#### 10.2.1 — Adaptar propiedad y persistencia

- **Alcance:** sustituir la relación única usuario-luchador por una relación compatible de uno a varios; conservar límites de integridad, propiedad, nombres/códigos y consultas existentes; acordar límites de cantidad o frecuencia solo según 10.1.
- **Aceptación:** una cuenta puede poseer más de un luchador; ningún usuario puede leer o modificar luchadores ajenos mediante IDs manipulados; el luchador preexistente continúa asociado al dueño correcto; índices y validaciones permiten varios luchadores sin relajar la unicidad que 10.1.1 haya aprobado.
- **Pruebas:** fixture legado, creación de varios luchadores, conflicto de nombre/código, consultas de propiedad, autorización denegada y rollback de escrituras fallidas.
- **Dependencia:** 10.1.2.

#### 10.2.2 — Crear servicios y API de gestión de luchadores

- **Alcance:** listar luchadores propios, crear nuevos, consultar el luchador activo y cambiar selección; definir explícitamente si se permite archivar, eliminar o renombrar y con qué restricciones históricas; validar y limitar toda entrada en servidor.
- **Aceptación:** las operaciones solo afectan personajes propios; el servidor rechaza exceso de creación, campos desconocidos, nombres inválidos y estados no permitidos; reintentos no producen luchadores duplicados; las rutas anteriores mantienen compatibilidad o se versionan/documentan sin filtrar datos privados.
- **Pruebas:** API de éxito y error, autenticación, autorización, validación, límites, idempotencia y acceso legado.
- **Dependencia:** 10.2.1.

#### 10.2.3 — Añadir selección y gestión en la interfaz

- **Alcance:** presentar la lista de luchadores propios, su resumen y el cambio de activo; mostrar estados de carga, vacío, error y éxito; conservar navegación existente y uso móvil.
- **Aceptación:** es claro qué luchador está activo; un usuario puede cambiar entre sus personajes y ver el correcto en panel, perfil propio y acciones; errores de servidor no se ocultan ni se muestran como cambios completados; lectores de pantalla y teclado pueden operar la selección.
- **Pruebas:** estados vacío/uno/varios/error, cambio de activo, regresión de navegación y accesibilidad básica.
- **Dependencia:** 10.2.2.

### 10.3 Crear y personalizar luchadores con atributos iniciales aleatorios

**Objetivo:** dar identidad visual propia a cada personaje y generar sus atributos dentro de límites de balance del servidor.

#### 10.3.1 — Definir apariencia y generación inicial

- **Alcance:** acordar opciones visuales originales (por ejemplo, silueta, tono, cabello, vestimenta y accesorios), qué opciones elige la persona y cuáles se sortean; definir distribución acotada de salud/vida, ataque/fuerza, defensa/agilidad y velocidad; decidir si se permite una semilla o elección del jugador y cómo impedir manipulación; especificar qué equipo, habilidades y mascotas pueden asignarse de inicio y qué parte del sorteo se repite o no.
- **Aceptación:** todas las combinaciones son válidas y representables; rangos y distribución evitan personajes extremos o dominantes; la elección estética no concede ventajas salvo que la regla lo diga expresamente; las opciones no copian arte, nombres ni diseños de referencia.
- **Pruebas:** revisión de límites, cobertura de opciones y análisis reproducible de la distribución.
- **Dependencia:** 10.2.3 y reglas de 10.1.

#### 10.3.2 — Implementar creación y persistencia de atributos y apariencia

- **Alcance:** generar y validar atributos en servidor; guardar apariencia en datos del luchador; añadir defaults compatibles para personajes existentes; impedir que el cliente envíe atributos finales fuera de las reglas.
- **Aceptación:** los valores guardados siempre caen en rangos aprobados; un reintento no cambia atributos ni crea un segundo personaje; los personajes anteriores conservan sus atributos y reciben una apariencia neutral compatible si carecen de ella; la persona puede revisar el resultado antes de confirmar cuando así lo defina el diseño.
- **Pruebas:** propiedades de rango, determinismo cuando corresponda, repetición, payload manipulado y fixture legado.
- **Dependencia:** 10.3.1.

#### 10.3.3 — Presentar creación y personalización

- **Alcance:** flujo claro para elegir nombre y opciones visuales, explicar qué es aleatorio, mostrar el resultado y ofrecer solo las repeticiones permitidas por diseño.
- **Aceptación:** la interfaz no promete elecciones que el servidor no admite; no simula resultados ni modifica atributos; muestra errores accionables y no pierde el formulario ante errores recuperables; funciona en escritorio y móvil.
- **Pruebas:** flujo completo en pruebas de UI, validación, estados de error y accesibilidad.
- **Dependencia:** 10.3.2.

### 10.4 Elegir rivales y administrar la arena por luchador

**Objetivo:** permitir que el jugador decida a quién desafiar sin quitar al servidor el control de elegibilidad, cupos y resultado.

#### 10.4.1 — Definir catálogo público y reglas de desafío

- **Alcance:** definir qué información de personajes públicos se lista; qué ocultará un perfil privado; filtros/búsqueda, criterios de elegibilidad, rango de nivel/ELO, exclusión del propio dueño, inactividad, repetición de rival, límites contra abuso y alternativa cuando no haya rivales.
- **Aceptación:** la selección pertenece al jugador; el servidor valida cada objetivo y la privacidad antes de aceptar el desafío; no se revela información privada; los bots o rivales de entrenamiento quedan claramente diferenciados y no generan ELO si así continúa el contrato aprobado.
- **Pruebas/verificación:** tabla de visibilidad y elegibilidad, solicitudes a objetivo propio/privado/inexistente y revisión de consistencia con ranking e historial.
- **Dependencia:** 10.1.1 y 10.2.2.

#### 10.4.2 — Implementar desafíos y cupos diarios por luchador

- **Alcance:** endpoint/servicio de desafío dirigido; reserva atómica de cupo para el luchador atacante; clave diaria acordada; política explícita para el día de creación; idempotencia, concurrencia, rechazos previos al combate y recuperación de errores.
- **Aceptación:** el límite se aplica por personaje, no se comparte accidentalmente entre los personajes de una cuenta; el objetivo no puede alterarse después de la validación; repetir el mismo request no consume dos cupos ni produce dos peleas/recompensas; peticiones simultáneas nunca exceden el límite; un rechazo antes de iniciar no cobra una pelea; el cliente no puede modificar contador ni fecha.
- **Pruebas:** límite agotado, zona UTC, excepción aprobada del primer día, simultaneidad, idempotencia, objetivo inválido, fallo transaccional y cuentas con varios personajes.
- **Dependencia:** 10.4.1.

#### 10.4.3 — Presentar selección y resultado del desafío

- **Alcance:** explorar rivales elegibles, ver información pública suficiente, confirmar el personaje propio y el objetivo antes de iniciar; presentar cupos restantes y resultado automático.
- **Aceptación:** interfaz y servidor coinciden sobre luchador propio, rival y cupos; la UI no selecciona un oponente distinto al confirmado; las peleas siguen siendo automáticas; la opción de combatir no queda disponible al llegar al límite y errores de red no aparentan un combate exitoso.
- **Pruebas:** selección, confirmación, cupos, perfil privado, carga/error y presentación de historial.
- **Dependencia:** 10.4.2.

### 10.5 Evolucionar atributos al subir de nivel

**Objetivo:** sustituir el crecimiento fijo actual por una mejora aleatoria controlada, conservando progresión justa y auditable.

#### 10.5.1 — Aprobar reglas de nivel y sorteo de atributos

- **Alcance:** mapear estadísticas actuales a conceptos de fuerza/agilidad/velocidad; decidir qué atributo puede subir por nivel, magnitud y límites; definir distribución/pesos, niveles múltiples, topes y relación con salud/defensa existentes; conservar o cambiar umbrales de XP solo con decisión explícita.
- **Aceptación:** cada subida tiene una regla y límites conocidos; los niveles ganados de una sola recompensa procesan todos los sorteos correspondientes una vez; no hay valores imposibles ni pérdida silenciosa de XP; la regla nueva está documentada en `PROJECT_SPEC.md`.
- **Pruebas/verificación:** ejemplos de nivel único y múltiple, valores límite, nivel máximo si existe y comparación con progreso actual.
- **Dependencia:** 10.1.1.

#### 10.5.2 — Implementar crecimiento aleatorio seguro

- **Alcance:** sortear en el servidor al confirmar XP; actualizar estadísticas de forma atómica/idempotente; guardar información necesaria para explicar progresión; versionar aleatoriedad si afecta a una pelea.
- **Aceptación:** cliente no puede escoger ni inflar aumentos; reintentos no repiten mejoras; fallo de persistencia no deja nivel y atributos desincronizados; las mismas entradas/versiones producen el resultado esperado; los luchadores existentes mantienen base y nivel.
- **Pruebas:** semilla controlada, distribución, concurrencia, niveles múltiples, reintentos, fallo transaccional y regresión de luchadores antiguos.
- **Dependencia:** 10.5.1.

#### 10.5.3 — Mostrar crecimiento y progreso

- **Alcance:** explicar la mejora otorgada y mostrar atributos actuales y anteriores sin recalcularlos en el cliente.
- **Aceptación:** la persona puede entender qué aumentó y por qué; la pantalla usa datos oficiales del servidor; subida múltiple y error se representan sin duplicar recompensas.
- **Pruebas:** render de aumentos, progreso sin aumento si se define, niveles múltiples y estados de error.
- **Dependencia:** 10.5.2.

### 10.6 Añadir armas y equipo aleatorio

**Objetivo:** añadir variedad táctica a la simulación mediante objetos obtenidos por progresión y carga automática, sin exigir microtransacciones ni decisiones de combate en tiempo real.

#### 10.6.1 — Diseñar catálogo, propiedad, equipamiento y efectos

- **Alcance:** definir tipos y espacios de equipo, tamaño inicial de catálogo original, obtención aleatoria al crear y subir de nivel, colección permanente, sorteo automático por combate, duplicados, modificadores, efectos especiales, golpe crítico y fallo crítico, límites y orden de resolución.
- **Aceptación:** cada objeto tiene identidad y valores propios; queda claro qué se guarda, qué se sortea al combatir y qué snapshot se registra; crítico y pifia son resultados distintos; los ejemplos de efectos no son valores definitivos hasta aprobar balance.
- **Pruebas/verificación:** revisar combinaciones, sin equipo, colección parcial/completa, duplicado y replay de combate.
- **Dependencia:** reglas de 10.1 y motor de 10.5.2.

#### 10.6.2 — Implementar catálogo, desbloqueo y carga aleatoria

- **Alcance:** definiciones versionadas del lado del servidor; colección persistente; oportunidades de desbloqueo ligadas a creación/progresión según diseño; sorteo reproducible de carga; efectos permitidos en motor.
- **Aceptación:** nadie puede obtener/equipar objetos enviando IDs arbitrarios; no hay desbloqueos duplicados por reintento; el equipo sorteado pertenece a la colección; sin objetos se mantiene un combate válido; versionado/snapshot permite reproducir peleas antiguas.
- **Pruebas:** catálogo inválido, propiedad, desbloqueo, pifia, crítico, efectos, semilla, transacción y snapshot legado.
- **Dependencia:** 10.6.1.

#### 10.6.3 — Mostrar colección, desbloqueos y equipo del combate

- **Alcance:** UI de colección y presentación de carga/equipamiento en resultado e historial.
- **Aceptación:** colección y carga sorteada se distinguen; eventos explican efectos sin ocultar el registro de combate; historial anterior sigue legible; la UI no permite alterar combate ni inventario.
- **Pruebas:** colección vacía/llena, desbloqueo, pelea nueva e histórica, errores y accesibilidad.
- **Dependencia:** 10.6.2.

### 10.7 Añadir habilidades que actúan automáticamente

**Objetivo:** incorporar técnicas propias que se desbloquean por progresión y se resuelven como parte de la simulación automática.

#### 10.7.1 — Definir catálogo y condiciones

- **Alcance:** categorías pasivas/activas, condiciones de disparo, frecuencia, objetivos, duración, acumulación, interacción con equipo/mascotas, asignación inicial aleatoria, desbloqueo aleatorio al progresar y contrajuego.
- **Aceptación:** no hay activaciones ilimitadas, ciclos infinitos ni reglas ambiguas; las condiciones son evaluables por el servidor; catálogo y textos son originales.
- **Pruebas/verificación:** tabla de condiciones/efectos y análisis de extremos.
- **Dependencia:** 10.1.1 y modelo de evento de 10.6.

#### 10.7.2 — Implementar habilidades versionadas y reproducibles

- **Alcance:** resolver habilidades únicamente en servidor; persistir propiedad/desbloqueo; integrar eventos, semilla, snapshots y versión de reglas.
- **Aceptación:** solo habilidades válidas y poseídas pueden activarse; mismas entradas/semilla/versiones producen el mismo resultado; los eventos identifican disparo y efecto; las peleas anteriores no se reinterpretan.
- **Pruebas:** cada condición, límites, no activación, interacción, replay, payload manipulado y regresión sin habilidades.
- **Dependencia:** 10.7.1.

#### 10.7.3 — Mostrar habilidades y sus activaciones

- **Aceptación:** se entiende qué habilidades posee el luchador y cuáles actuaron en la pelea; historial antiguo y errores conservan representación válida; no se exponen datos de rivales privados.
- **Pruebas:** colección, activaciones, combate antiguo/nuevo, privacidad y accesibilidad.
- **Dependencia:** 10.7.2.

### 10.8 Añadir mascotas con función de juego

**Objetivo:** permitir que los luchadores obtengan acompañantes originales que influyan de forma limitada y explícita en la simulación.

#### 10.8.1 — Definir colección, estadísticas y reglas

- **Alcance:** catálogo y familias originales, propiedad, asignación inicial aleatoria y posibilidad de desbloqueo por nivel, número de mascotas por luchador/combate, contribución, activaciones y límites; definir cómo se relacionan con armas y habilidades.
- **Aceptación:** se conoce exactamente qué puede acompañar al luchador, qué aporta, cómo se obtiene y cómo se impide que una mascota domine o multiplique efectos.
- **Pruebas/verificación:** casos sin mascota, una mascota, duplicados y efectos combinados.
- **Dependencia:** 10.1.1 y reglas versionadas del motor.

#### 10.8.2 — Persistir y resolver mascotas

- **Aceptación:** propiedad validada en servidor; adquisición idempotente; stats/efectos versionados y reproducibles; snapshots históricos completos; luchadores existentes funcionan sin mascotas.
- **Pruebas:** propietario/no propietario, desbloqueo, semilla, límites, combinación con habilidad/equipo y replay.
- **Dependencia:** 10.8.1.

#### 10.8.3 — Mostrar colección y participación de mascotas

- **Aceptación:** se muestra qué mascotas posee el luchador y qué aportó su acompañante al combate; sin mascotas se conserva una pantalla normal; textos y recursos visuales son propios.
- **Pruebas:** vacío, colección, combate, historial, privacidad y accesibilidad.
- **Dependencia:** 10.8.2.

### 10.9 Desarrollar dojos y relación de maestro/aprendiz

**Objetivo:** convertir las invitaciones existentes en una función social/progresiva de reclutamiento que no permita cuentas propias ni recompensas abusables.

#### 10.9.1 — Definir reglas de dojo y recompensas

- **Alcance:** decidir si el dojo pertenece a una cuenta o luchador, asociación de aprendices, invitaciones, límites, salida/transferencia, visibilidad, clasificación y recompensas; coordinar con `referredByUserId` y códigos actuales.
- **Aceptación:** la relación es inequívoca, no se puede reclutar a uno mismo ni cambiar retroactivamente de maestro para obtener premios, y toda recompensa (si se aprueba) tiene condiciones medibles y resistentes a abuso; el comportamiento actual de invitaciones se documenta.
- **Pruebas/verificación:** escenarios de registro referido existente, invitación repetida, cuenta propia, aprendiz inactivo y recompensa duplicada.
- **Dependencia:** 10.1.1. No otorgar nuevas recompensas antes de aprobar este diseño.

#### 10.9.2 — Implementar relaciones, consultas y acciones del dojo

- **Aceptación:** propietario y aprendiz se determinan en servidor; no se puede cambiar relación mediante payload; conteos y clasificaciones son consistentes; cambios parciales y solicitudes repetidas no duplican relaciones ni premios; los datos referidos existentes se conservan.
- **Pruebas:** alta válida, conflictos, autorización, idempotencia, abuso y fixtures de invitación antiguos.
- **Dependencia:** 10.9.1.

#### 10.9.3 — Presentar dojo y aprendices

- **Aceptación:** la interfaz explica maestro/aprendiz, lista solo información pública permitida y comunica estados vacío/error; no ofrece premios no definidos ni expone correos u otros datos privados.
- **Pruebas:** dojo vacío/lleno, privacidad, errores y accesibilidad.
- **Dependencia:** 10.9.2.

### 10.10 Integrar, balancear y verificar la expansión

**Objetivo:** comprobar el ciclo completo con cuentas y luchadores múltiples sin perjudicar el MVP ni el historial persistido.

#### 10.10.1 — Ejecutar pruebas de integración y regresión

- **Alcance:** recorrido desde cuenta existente y nueva, varios luchadores, creación aleatoria, selección de rival, cupos diarios, pelea automática, progresión, desbloqueos, equipo, habilidades, mascotas, dojo e historial.
- **Aceptación:** pruebas relevantes pasan; autorización y propiedad resisten IDs manipulados; concurrencia e idempotencia no duplican peleas, límites ni recompensas; los datos legados y replays sobreviven; interfaz y API coinciden. Las rutas v1 que requieren un luchador único responden `409 MULTIPLE_FIGHTERS_REQUIRE_V2` cuando la cuenta autenticada posee varios, incluida la consulta singular de detalle de combate `GET /api/v1/battles/:id`.
- **Pruebas:** suites focalizadas y completas de los scripts existentes; pruebas con fixtures antiguos y varios luchadores, verificando que todas las rutas v1 singulares rechacen de forma consistente las cuentas con varios luchadores (incluido `GET /api/v1/battles/:id`); no usar cuentas ni datos reales de producción.
- **Dependencia:** 10.2 a 10.9.

#### 10.10.2 — Medir balance, seguridad operativa y recuperación

- **Alcance:** simulaciones reproducibles a gran escala; revisar distribución de atributos, progreso, poder de armas/habilidades/mascotas, ventajas de cuentas múltiples y abuso de desafíos/reclutamiento; documentar métricas y rollback.
- **Aceptación:** resultados reproducibles apoyan los límites de balance; no hay combinaciones que bloqueen la pelea o excedan límites; cada cambio de esquema tiene plan probado de respaldo/recuperación; problemas conocidos quedan documentados antes de cerrar la etapa.
- **Pruebas:** simulación con semillas/versiones controladas, escenarios límite, análisis de distribución y simulación de recuperación sobre datos de prueba.
- **Dependencia:** 10.10.1.

#### 10.10.3 — Cerrar la etapa y preparar activación controlada

- **Alcance:** documentar comandos, cambios de contrato, migraciones, monitorización, soporte y comunicación del lanzamiento; activar funciones solo según el procedimiento aprobado.
- **Aceptación:** criterios de 10.1–10.10 cumplidos; PROJECT_SPEC y ROADMAP coinciden con lo implementado; no hay migraciones/despliegues de producción sin autorización explícita; se informa cualquier limitación pendiente.
- **Pruebas/verificación:** revisión final de checklist, documentación y plan de rollback. No implica desplegar por sí misma.
- **Dependencia:** 10.10.2.

## Propuestas futuras no priorizadas

Estas propuestas no forman parte del orden de ejecución ni autorizan trabajo. Antes de implementarlas, deben evaluarse, aprobarse y recibir un ID y una posición explícitos en la hoja de ruta.

- **Evaluar elecciones manuales de recompensas al subir de nivel:** estudiar una variante futura que ofrezca alternativas de objetos o mejoras para elegir, en contraste con la progresión automática de la primera versión. No cambia el comportamiento de 10.5 ni autoriza a adelantarlo en los pasos 10.6–10.8.

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
