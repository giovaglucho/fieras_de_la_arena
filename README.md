# Fieras de la Arena

Juego web de combates automáticos inspirado en el ciclo de crear luchador, combatir, progresar y competir en una clasificación. Proyecto original construido con MongoDB, Express, React y Node.js.

## Documentos del proyecto

- [`PROJECT_SPEC.md`](PROJECT_SPEC.md): visión, reglas de juego, arquitectura, seguridad, datos, API y criterios generales.
- [`ROADMAP.md`](ROADMAP.md): etapas y tareas ordenadas desde cero hasta una versión 1.0.
- [`CURRENT_STEP.md`](CURRENT_STEP.md): única tarea autorizada para desarrollar ahora.
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md): reglas permanentes para que Copilot no se adelante ni modifique áreas ajenas a la tarea.

## Regla de trabajo

Desarrollar una sola tarea de `ROADMAP.md` por iteración. Verificar sus criterios, informar los resultados y detenerse. No iniciar el siguiente paso hasta que el usuario lo autorice y `CURRENT_STEP.md` lo active.

## Estado actual

El cliente React con Vite incluye registro e inicio de sesión conectados a la API, sesión persistente, creación de luchador y rutas protegidas. También están implementados el dashboard del jugador, Arena, resultados e historial de combates, perfiles públicos, clasificaciones por ELO, nivel y cantidad de alumnos confirmados, y una sección de alumnos con enlace de invitación y resumen público de las cuentas asociadas. Los resultados muestran una animación básica basada en eventos guardados junto al registro textual, además del progreso oficial de XP, niveles y atributos. El servidor Express usa MongoDB con Mongoose y proporciona autenticación, gestión de luchadores, invitaciones, combates e intentos diarios. Los combates se simulan y persisten en el servidor.

**Estado del desarrollo:** los pasos **10.1.1 — Convertir la visión en reglas de juego propias**, **10.1.2 — Definir el plan de datos, API y transición de cuentas**, **10.2.1 — Adaptar propiedad y persistencia**, **10.2.2 — Crear servicios y API de gestión de luchadores**, **10.2.3 — Añadir selección y gestión en la interfaz**, **10.3.1 — Definir apariencia y generación inicial**, **10.3.2 — Implementar creación y persistencia de atributos y apariencia**, **10.3.3 — Presentar creación y personalización**, **10.4.1 — Definir catálogo público y reglas de desafío**, **10.4.2 — Implementar desafíos y cupos diarios por luchador**, **10.4.3 — Presentar selección y resultado del desafío**, **10.5.1 — Aprobar reglas de nivel y sorteo de atributos**, **10.5.2 — Implementar crecimiento aleatorio seguro**, **10.5.3 — Mostrar crecimiento y progreso**, **10.6.1 — Diseñar catálogo, propiedad, equipamiento y efectos**, **10.6.2 — Implementar catálogo, desbloqueo y carga aleatoria**, **10.6.3 — Mostrar colección, desbloqueos y equipo del combate**, **10.7.1 — Definir catálogo y condiciones**, **10.7.2 — Implementar habilidades versionadas y reproducibles**, **10.7.3 — Mostrar habilidades y sus activaciones**, **10.8.1 — Definir colección, estadísticas y reglas**, **10.8.2 — Persistir y resolver mascotas** y **10.8.3 — Mostrar colección y participación de mascotas** están implementados y el paso 10.8.3 ya está integrado en `master` tras aprobar el QA. **Etapa 11 en curso (rama `etapa-11`):** el juego se rediseña sobre la mecánica del remake de *El Bruto* (ver `PROJECT_SPEC.md` sección 4.9 y `docs/research/el-bruto-investigacion-tecnica.md`). Los pasos 10.9.2, 10.9.3 y 10.10.x quedan reemplazados por la etapa 11. **El paso activo autorizado es 11.0.1 — Contrato de producto del rediseño; está pendiente, no implementado.** El texto siguiente describe el estado de la etapa 10, previo al rediseño. (Paso anterior: 10.9.1 — Definir reglas de dojo y recompensas, diseño completado.) La colección de habilidades y mascotas del luchador propio, y la presentación de snapshots y eventos en combates, mantienen la privacidad de rivales no elegibles y aceptan historiales anteriores. Las suites API de luchadores y arena verifican propiedad, privacidad, historial e idempotencia concurrente. El resultado del combate presenta el progreso de XP, niveles y atributos; la Arena permite combatir con rivales públicos elegibles y el historial incluye los combates de todas las fichas propias. Las mascotas se persisten y sortean de forma reproducible, se validan por propietario, quedan registradas en snapshots históricos y participan en combates versionados; los eventos de daño a mascotas no se confunden con daño a luchadores. La colección de mascotas y su contribución quedan visibles en la ficha, el resultado y el historial. La elección manual de recompensas al subir de nivel continúa como propuesta no priorizada ni autorizada. El despliegue de prueba está activo en [Render](https://fieras-de-la-arena.onrender.com/).

## Requisitos

- Node.js `20.19+` o `22.12+` (requisito de la versión actual de Vite).
- npm, incluido con Node.js.
- MongoDB Community Server local en ejecución para iniciar el servidor y ejecutar las pruebas de integración.
- MongoDB configurado como replica set local (por ejemplo, `rs0`): las transacciones de crear luchadores y resolver combates lo exigen. Comprueba tu instalación con `npm run check:mongo` desde la raíz; el servidor también avisa al arrancar si no lo es.
- PowerShell para seguir los comandos de esta guía en Windows.
- En el entorno donde se comprobó el proyecto: Node.js `v24.20.0` y npm `11.19.0`.

Comprueba las versiones desde PowerShell:

```powershell
node --version
npm.cmd --version
```

Instala [MongoDB Community Server para Windows](https://www.mongodb.com/try/download/community) y selecciona la opción de instalarlo como servicio. Antes de continuar, verifica que el servicio esté iniciado:

```powershell
Get-Service MongoDB
```

Si el servicio existe pero está detenido, inicia PowerShell con permisos suficientes y ejecuta `Start-Service MongoDB`. Si el nombre del servicio difiere en tu instalación, usa el nombre que muestre `Get-Service`.

## Configuración local

Desde la raíz del repositorio, crea `.env` únicamente si todavía no existe, para no sobrescribir una configuración local:

```powershell
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
} else {
  Write-Output ".env ya existe; no se sobrescribió."
}
```

`.env` está ignorado por Git. Abre ese archivo y reemplaza `SESSION_SECRET` por un valor aleatorio propio; no uses ni publiques el valor de ejemplo. Puedes generar uno localmente con Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

El comando muestra el secreto en tu terminal: cópialo directamente a `.env`, no lo compartas ni lo guardes en Git. Debe contener al menos 32 bytes. Las variables locales son:

| Variable | Valor local predeterminado | Uso |
| --- | --- | --- |
| `NODE_ENV` | `development` | Activa la configuración de desarrollo. |
| `PORT` | `3000` | Puerto HTTP del servidor. |
| `CLIENT_URL` | `http://localhost:5173` | Origen permitido para el cliente; debe ser un origen exacto, sin ruta ni barra final. |
| `TRUST_PROXY` | `0` | Saltos de proxy inverso de confianza; déjalo en `0` para desarrollo local. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/fieras_de_la_arena` | Conexión a MongoDB local. |
| `SESSION_SECRET` | Sin valor seguro predeterminado | Secreto aleatorio propio de al menos 32 bytes. |

El servidor no empieza a escuchar si faltan variables obligatorias o no puede conectarse a MongoDB. Las sesiones se guardan en MongoDB y usan una cookie `httpOnly`, `sameSite=lax` y `secure` en producción. Helmet configura cabeceras de seguridad. En local, Vite envía `/api` al servidor en `http://localhost:3000`. `TRUST_PROXY` debe permanecer en `0` salvo que el servidor se encuentre realmente detrás de proxies inversos de confianza; no es necesario para la ejecución local.

## Ejecutar el cliente y el servidor

`POST /api/v1/auth/register` recibe `username`, `email` y `password`, con `referralCode` opcional. Un código válido vincula la cuenta nueva con su referente y uno inválido se rechaza con HTTP 400. Un registro correcto crea una sesión autenticada y devuelve la cookie segura de sesión junto con los datos públicos de la cuenta; el cliente continúa al flujo de creación del luchador.
El endpoint `POST /api/v1/auth/login` recibe `identifier` (nombre de usuario o correo) y `password`. `POST /api/v1/auth/logout` destruye una sesión iniciada.
La API limita el registro a 5 solicitudes por hora y por IP, el inicio de sesión a 10 intentos fallidos cada 15 minutos por IP, la creación de luchadores (5 por hora y cuenta, 30 por IP), los combates a 5 por minuto y cuenta, y las consultas privadas a 60 por minuto y cuenta. Estas consultas son `GET /api/v1/auth/me`, `/api/v1/fighters/me`, `/api/v1/arena/attempts`, `/api/v1/arena/history`, `/api/v1/battles/:id` y `/api/v1/referrals/me` (y sus equivalentes v2). Las peticiones que la persona puede corregir no consumen cupo: los errores de formato (HTTP 400) del registro, los 400/409 de la creación de luchadores y los 400/404/409 de los desafíos; los inicios de sesión correctos tampoco. Los conflictos 409 del registro sí cuentan, para que no se pueda averiguar sin límite qué usuarios o correos existen. El exceso responde HTTP 429 con el código `RATE_LIMIT_EXCEEDED`, la cabecera `Retry-After` y `retryAfterSeconds` en el cuerpo; la interfaz muestra cuánto esperar. Los contadores se guardan en MongoDB (colección `ratelimits`, con caducidad automática): sobreviven a reinicios y se comparten entre instancias. Los límites se pueden ajustar con las variables opcionales `REGISTRATION_RATE_LIMIT`, `LOGIN_RATE_LIMIT`, `SENSITIVE_READ_RATE_LIMIT`, `FIGHTER_CREATION_ACCOUNT_LIMIT`, `FIGHTER_CREATION_IP_LIMIT` y `FIGHTER_CREATION_WINDOW_MS`; `RATE_LIMIT_STORE=memory` usa contadores en memoria (lo emplean las pruebas).
`GET /api/v1/auth/me` requiere la cookie de sesión y devuelve únicamente `id`, `username` y `email` de la cuenta autenticada; sin sesión responde HTTP 401.
`GET /api/v1/fighters/me` requiere sesión y devuelve `{ "fighter": null }` si la cuenta aún no creó un luchador, o el perfil propio con `id`, `username`, `name`, `level`, `xp`, `elo`, `baseStats`, `stats` (estadísticas efectivas calculadas por el servidor), `xpToNextLevel`, `wins`, `losses` y `draws`; sin sesión responde HTTP 401.
`GET /api/v1/fighters/:id` y `GET /api/v1/profiles/:username` son públicos y devuelven los campos públicos del luchador por ID o nombre de usuario, sin las estadísticas efectivas ni el umbral de XP del endpoint propio. Si el perfil no existe, responden HTTP 404. Ninguna respuesta de perfil incluye correo, `userId`, `referralCode`, contraseña ni datos de sesión.
`POST /api/v1/fighters` requiere esa misma sesión y recibe únicamente `{ "name": "Nombre" }`. El nombre tiene de 3 a 18 caracteres: letras (con acentos), números y separadores simples (espacio, guion o guion bajo) entre grupos; se rechazan HTML, emojis y símbolos, y los espacios repetidos se colapsan. El servidor conserva las mayúsculas elegidas (`displayName`) y usa la versión en minúsculas como clave única (`name`); los luchadores anteriores sin `displayName` se muestran con su nombre guardado. Asigna los valores iniciales; las cuentas que ya tienen un luchador reciben HTTP 409.
`GET /api/v1/referrals/me` requiere sesión y un luchador; devuelve el `referralCode` propio y `students`, una lista de cuentas asociadas con el nombre de usuario público y, si existe, el nombre y nivel del luchador. No incluye correos, IDs ni otros datos privados. Responde HTTP 404 si la cuenta todavía no tiene luchador. El código se genera en el servidor al crear el luchador y no se acepta como entrada. La sección `/students` permite copiar un enlace de invitación y consultar esta lista.
`GET /api/v2/referrals/me` devuelve lo mismo pero funciona con cuentas de uno o varios luchadores, porque el dojo pertenece a la cuenta: usa el código del luchador activo o, si no hay uno activo, el de la ficha más antigua. Es la ruta que usa la sección `/students`; la v1 responde 409 `MULTIPLE_FIGHTERS_REQUIRE_V2` con varias fichas.
`GET /api/v1/leaderboards` es público y paginado (`category=elo|level|students`). Muestra **una fila por cuenta**, representada por su mejor ficha para la categoría, y excluye luchadores privados o suspendidos. `category=students` ordena por la cantidad de cuentas registradas cuyo `referredByUserId` apunta a la cuenta dueña; los empates se resuelven por ID de cuenta. La cantidad se calcula en el servidor y no se acepta como entrada del cliente.
`GET /api/v2/arena/opponents` requiere sesión y devuelve rivales públicos elegibles dentro de ±200 ELO, ordenados por diferencia de ELO, con búsqueda por nombre, filtros de nivel y paginación. La respuesta solo incluye ID, nombre, nombre de usuario, nivel, ELO, apariencia y contadores públicos; perfiles privados, cuentas suspendidas, luchadores propios y rivales ya desafiados ese día quedan excluidos.
`GET /api/v2/arena/attempts` requiere sesión y devuelve la ficha activa junto con `dateKey`, `limit`, `used` y `remaining` del día UTC. `GET /api/v2/arena/history` requiere sesión y devuelve el historial paginado de todas las fichas propias; cada combate identifica `ownFighterId` para representar correctamente resultados de cuentas con varios luchadores. Se puede añadir `fighterId` para filtrar por una ficha propia; el servidor valida la propiedad y responde 404 para IDs que no pertenecen a la cuenta.
`GET /api/v2/fighters/active` requiere sesión y devuelve la ficha activa propia con sus colecciones de equipo, habilidades y mascotas, incluidos nombres, efectos y desbloqueos sin semillas ni claves internas. Los perfiles públicos, el catálogo de rivales y la lista paginada de luchadores propios no exponen estas colecciones; los perfiles privados responden como inexistentes tanto por nombre como por identificador.
`POST /api/v2/arena/challenges` requiere sesión y recibe únicamente `{ "fighterId": "...", "opponentFighterId": "...", "requestId": "..." }`. El servidor comprueba que el luchador propio esté seleccionado, valida privacidad y elegibilidad del objetivo, aplica el rango de ±200 ELO y los cupos diarios por personaje. Un reintento idéntico recupera el combate guardado; reutilizar la clave con otro objetivo responde HTTP 409. Los rechazos anteriores al inicio no consumen cupo.
El historial y el detalle autorizado de `GET /api/v1/battles/:id` incluyen snapshots de equipo, habilidades y mascotas; el detalle también presenta la participación de las mascotas y conserva eventos de combate junto con los valores oficiales de XP, nivel y estadísticas anteriores y posteriores a la recompensa. No se devuelven semillas ni claves de idempotencia; los registros antiguos sin snapshots de equipo, habilidades, mascotas o progresión siguen siendo válidos.

En una primera terminal, instala e inicia el cliente:

```powershell
Set-Location client
npm.cmd ci
npm.cmd run dev
```

Abre la URL local que indique Vite (normalmente `http://localhost:5173`). Mantén esta terminal abierta.

En una segunda terminal abierta en la raíz del repositorio, instala e inicia el servidor:

```powershell
Set-Location server
npm.cmd ci
npm.cmd run dev
```

Los archivos `package-lock.json` de cada carpeta fijan las versiones instaladas; `npm.cmd ci` instala esas dependencias. El servidor lee el `.env` de la raíz del repositorio mediante la opción `--env-file` de Node.js. Los errores inesperados se registran como JSON en la terminal del servidor, con el evento, el tipo/código del error y, para solicitudes API, el método, la ruta y el estado. No se incluyen mensajes ni trazas de excepción para evitar exponer datos sensibles. Para comprobar el endpoint de salud desde otra terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
```

La respuesta debe incluir `status` con valor `ok` y `database` con valor `connected`. Si MongoDB deja de estar disponible, el endpoint devuelve HTTP 503 y refleja `database: "disconnected"`. El cliente y el servidor se ejecutan en terminales independientes; para detener cada uno, pulsa `Ctrl+C` en su terminal.

## Estructura del repositorio

```text
client/
  src/api/          Llamadas del cliente a la API
  src/context/      Estado compartido de sesión
  src/pages/        Una pantalla por archivo (Dashboard, Arena, Alumnos, Clasificación…)
  src/routes/       Guardas de ruta (invitados, sesión, luchador)
  src/components/   Componentes compartidos
  src/              App.jsx (rutas), estilos y utilidades
  vite.config.js    Servidor de desarrollo y proxy /api
server/
  src/config/       Configuración del servidor y del juego
  src/game-engine/  Simulación y reglas de progresión
  src/middleware/   Sesiones, CORS, autorización y errores
  src/models/       Modelos de MongoDB
  src/routes/       Rutas HTTP de la API
  src/serializers/  Respuestas públicas
  src/services/     Casos de uso y lógica de aplicación
  src/utils/        Utilidades del servidor
  src/validators/   Validación de entradas
  scripts/          Migraciones, comprobación del replica set y runner de pruebas
  test/             Pruebas del servidor
e2e/                Pruebas end-to-end (Playwright)
playwright.config.js Configuración de Playwright (servidor 3100 + cliente 5174, base `fieras_e2e`)
package.json        Atajos de la raíz (no tiene dependencias de ejecución)
render.yaml         Configuración del despliegue de prueba en Render
.env.example        Plantilla de configuración local
PROJECT_SPEC.md     Especificación funcional y técnica
ROADMAP.md          Pasos ordenados del proyecto
CURRENT_STEP.md     Único paso autorizado
```

Las reglas de juego y el acceso a datos pertenecen al servidor; React presenta la interfaz y consume la API. El `package.json` de la raíz solo contiene Playwright y atajos (`npm run test:server`, `test:client`, `test:e2e`, `check:mongo`); la aplicación se instala y ejecuta desde `client` y `server`.

## Comandos y pruebas

Ejecuta estos comandos desde la carpeta indicada.

| Carpeta | Comando | Resultado |
| --- | --- | --- |
| `client` | `npm.cmd run dev` | Inicia Vite para desarrollo. |
| `client` | `npm.cmd run build` | Construye el cliente en `client/dist/`. |
| `client` | `npm.cmd run preview` | Sirve localmente el build existente. |
| `client` | `node --test test/battleAnimation.test.js` | Prueba la lectura de ataques persistidos para la animación visual. |
| `client` | `node --test test/battleProgression.test.js` | Prueba el renderizado del progreso, subidas múltiples y estados de error. |
| `client` | `node --test test/equipmentUi.test.js` | Prueba colecciones, participación de mascotas, desbloqueos, snapshots nuevos/legados, errores y accesibilidad. |
| `client` | `node --test test/dashboardApi.test.js` | Prueba las consultas v2 de cupos e historial filtrado del panel. |
| `client` | `node --test test/favicon.test.js` | Comprueba que `/favicon.ico` devuelve un recurso visual válido en desarrollo. |
| `client` | `npm.cmd test` | Ejecuta todas las pruebas del cliente (`node --test test/*.test.js`). |
| `server` | `npm.cmd run dev` | Inicia el servidor con recarga al cambiar archivos. |
| `server` | `npm.cmd start` | Inicia el servidor sin modo de observación. |
| `server` | `npm.cmd test` | Verifica el replica set y ejecuta todas las pruebas contra una base **nueva y desechable** (se elimina al terminar), con tiempo máximo por prueba. Acepta archivos: `npm.cmd test -- test/auth.test.js`. |
| `server` | `npm.cmd run test:unit` | Ejecuta solo las pruebas unitarias del motor (no necesitan MongoDB). |
| `server` | `npm.cmd run check:mongo` | Comprueba que `MONGODB_URI` apunte a un replica set. |
| raíz | `npm.cmd run test:e2e` | Pruebas end-to-end con Playwright (levanta su propio servidor, cliente y base `fieras_e2e`). |
| raíz | `npm.cmd run test:e2e:headed` | Igual, con el navegador visible. |

Las pruebas unitarias del motor y de progresión no necesitan MongoDB. Desde `server`, puedes ejecutarlas de forma aislada:

```powershell
node --test test/petCatalog.test.js test/petCombat.test.js test/equipmentCatalog.test.js test/equipmentSerialization.test.js test/techniqueCatalog.test.js test/techniqueCombat.test.js test/combatSimulation.test.js test/fighterCreation.test.js test/fighterStats.test.js test/fighterGrowth.test.js test/progression.test.js
```

La suite completa incluye pruebas de API e integración que se conectan a MongoDB (replica set). `npm.cmd test` crea una base temporal `fieras_test_*` a partir de `MONGODB_URI`, la elimina al terminar y no toca tus datos; así una base de pruebas antigua (por ejemplo con índices legados) no puede romper ni colgar la suite. Variable opcional: `TEST_TIMEOUT_MS` (60000 por defecto).

```powershell
Set-Location server
npm.cmd test
```

### Pruebas end-to-end (Playwright)

Desde la raíz del repositorio, la primera vez instala el navegador: `npm.cmd install` y `npx.cmd playwright install chromium`. Después:

```powershell
npm.cmd run test:e2e
```

Playwright levanta el servidor en el puerto `3100`, el cliente en `5174` y usa la base `fieras_e2e`, que se recrea en cada ejecución; no necesita que tengas el entorno de desarrollo corriendo ni toca tus datos. El informe HTML queda en `playwright-report/`.

Las bases que aún conservan el esquema legado de propiedad deben migrarse antes de crear varios luchadores por cuenta. El script ofrece un preflight de solo lectura y un modo de aplicación. En producción, el modo de aplicación exige confirmar el nombre exacto de la base, un respaldo verificado y declarar que las escrituras están pausadas. Primero ejecuta el preflight contra la base correcta; no compartas ni guardes la URI en Git:

```powershell
Set-Location server
$secureUri = Read-Host "URI MongoDB de destino" -AsSecureString
$env:MONGODB_URI = [System.Net.NetworkCredential]::new("", $secureUri).Password
$env:MIGRATION_TARGET_DATABASE = Read-Host "Nombre exacto de la base MongoDB"
$env:NODE_ENV = "production"
$env:MIGRATION_MODE = "preflight"
node scripts/migrateFighterOwnershipV1.js
```

Revisa el resultado `fighter.ownership_migration.preflight`. Si el comando falla por datos huérfanos, referencias inválidas o actividades diarias ambiguas, no intentes aplicar la migración ni modifiques esos documentos automáticamente.

Para aplicar en Render: verifica que exista una copia recuperable, pausa el servicio web de Render y cualquier otro proceso que escriba en MongoDB, vuelve a ejecutar el comando anterior con `MIGRATION_MODE=apply` y estas confirmaciones explícitas:

```powershell
$env:MIGRATION_MODE = "apply"
$env:MIGRATION_WRITES_PAUSED = "true"
$env:MIGRATION_BACKUP_VERIFIED = "true"
$env:MIGRATION_CONFIRMATION = "$($env:MIGRATION_TARGET_DATABASE):migrate-fighter-ownership-v1"
node scripts/migrateFighterOwnershipV1.js
```

El comando revalida los datos antes de cambiar índices. Solo asocia actividades legadas cuando el dueño tiene exactamente un luchador; las actividades ya asociadas se conservan. Si hay una actividad sin luchador cuyo dueño tiene varias fichas, se detiene antes de escribir para evitar asignar cupos al personaje equivocado. Tras `fighter.ownership_migration.apply`, confirma los índices/cupos y la salud del servicio, reanuda Render y prueba crear una segunda ficha. No borres índices manualmente ni ejecutes el modo `apply` sin pausa y respaldo. Al terminar, limpia las variables de entorno de esa terminal.

## Despliegue de prueba gratuito

La configuración [`render.yaml`](render.yaml) prepara un único servicio web gratuito en la región Virginia de Render. Compila React, sirve sus archivos desde Express y utiliza el mismo origen para la interfaz y la API. Render proporciona HTTPS y configura la comprobación HTTP en `/api/v1/health`; no hace falta comprar un dominio para esta prueba. `SESSION_SECRET` se genera en Render y `MONGODB_URI` se introduce directamente en su panel, no en Git.

El servidor admite que Render inyecte las variables de entorno sin que exista un archivo `.env` en el servidor. En producción, si `CLIENT_URL` no está definido, CORS permanece desactivado: el cliente y la API comparten origen. No configures un cliente alojado en otro origen sin definir y revisar explícitamente CORS.

El servicio de prueba está desplegado en el plan gratuito de Render, en Virginia, y utiliza un clúster Atlas M0 en N. Virginia (`us-east-1`). La lista de acceso de Atlas incluye los rangos de salida compartidos de Render, sin abrir el acceso a cualquier dirección IP. El endpoint [`/api/v1/health`](https://fieras-de-la-arena.onrender.com/api/v1/health) respondió correctamente con `status: "ok"` y `database: "connected"`.

Este despliegue y la base gratuita son solo para pruebas, no para producción ni datos importantes. Revisa las [limitaciones vigentes de Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/). El checklist de registro, login/logout, creación, combate, recompensas, historial, perfiles y ranking en el entorno publicado se completó en el paso 9.4.

El plan gratuito de Render suspende el servicio tras 15 minutos sin tráfico y el primer acceso posterior puede tardar alrededor de un minuto. No lo uses para un lanzamiento ni para almacenar datos que deban estar siempre disponibles. Render puede terminar TLS antes de reenviar HTTP al servicio; la configuración de producción activa la cookie segura, HSTS y un salto de proxy de confianza.

## Solución de problemas

- **El servidor dice que falta `SESSION_SECRET` o que es demasiado corta:** comprueba que `.env` está en la raíz del repositorio y que `SESSION_SECRET` tiene al menos 32 bytes. No uses el texto de ejemplo.
- **No se puede conectar a MongoDB (`ECONNREFUSED` o tiempo de espera):** confirma que MongoDB Community Server está instalado y en ejecución, y que `MONGODB_URI` apunta a la dirección correcta. El servidor no empezará a escuchar hasta conectarse.
- **El endpoint de salud responde HTTP 503:** Express está ejecutándose, pero no tiene una conexión activa a MongoDB; revisa el servicio y su URI.
- **El navegador no puede llamar a la API:** mantén el servidor activo en el puerto `3000`, usa el cliente iniciado por Vite y verifica que `CLIENT_URL` sea `http://localhost:5173`. Vite ya configura el proxy local para ese servidor.
- **Un puerto está ocupado:** cierra el proceso de desarrollo anterior que aún lo use y vuelve a iniciar el comando correspondiente.
- **`npm.cmd ci` falla:** comprueba la conexión a la red y la versión de Node.js; ejecútalo dentro de `client` o `server`, donde se encuentra el `package-lock.json`.
- **Render responde `FIGHTER_OWNERSHIP_MIGRATION_REQUIRED` al crear otro luchador:** la base conserva el índice único legado `fighters.userId`. Sigue el preflight y el procedimiento de migración de la sección de pruebas; no elimines índices manualmente ni reintentes creación antes de completar la migración.

Para las reglas del producto, la arquitectura y las decisiones del juego, consulta la especificación antes de modificar el proyecto.
