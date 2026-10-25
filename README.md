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

El cliente React con Vite incluye registro e inicio de sesión conectados a la API, sesión persistente, creación de luchador y rutas protegidas. También están implementados el dashboard del jugador, Arena, resultados e historial de combates, perfiles públicos, clasificaciones por ELO, nivel y cantidad de alumnos confirmados, y una sección de alumnos con enlace de invitación y resumen público de las cuentas asociadas. Los resultados muestran una animación básica basada en eventos guardados junto al registro textual. El servidor Express usa MongoDB con Mongoose y proporciona autenticación, gestión de luchadores, invitaciones, combates e intentos diarios. Los combates se simulan y persisten en el servidor.

**Estado del desarrollo:** los pasos **10.1.1 — Convertir la visión en reglas de juego propias**, **10.1.2 — Definir el plan de datos, API y transición de cuentas**, **10.2.1 — Adaptar propiedad y persistencia**, **10.2.2 — Crear servicios y API de gestión de luchadores**, **10.2.3 — Añadir selección y gestión en la interfaz**, **10.3.1 — Definir apariencia y generación inicial**, **10.3.2 — Implementar creación y persistencia de atributos y apariencia** y **10.3.3 — Presentar creación y personalización** están completados. El servidor genera los atributos iniciales y persiste la apariencia; la interfaz permite elegir opciones visuales, ver una vista previa y consultar los atributos asignados por el servidor al confirmar la creación. El panel permite consultar los luchadores propios, cambiar el activo y ver el perfil seleccionado; la Arena identifica al luchador activo. Las rutas de juego heredadas que no admiten varias fichas muestran explícitamente el error del servidor en cuentas con más de un luchador. El paso activo es **10.4.1 — Definir catálogo público y reglas de desafío**; la selección dirigida de rivales aún no está implementada. El despliegue de prueba está activo en [Render](https://fieras-de-la-arena.onrender.com/).

## Requisitos

- Node.js `20.19+` o `22.12+` (requisito de la versión actual de Vite).
- npm, incluido con Node.js.
- MongoDB Community Server local en ejecución para iniciar el servidor y ejecutar las pruebas de integración.
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
La API limita el registro a 5 solicitudes por hora y por IP, el inicio de sesión a 10 cada 15 minutos por IP, los combates a 5 por minuto y cuenta, y las consultas privadas a 60 por minuto y cuenta. Estas consultas son `GET /api/v1/auth/me`, `/api/v1/fighters/me`, `/api/v1/arena/attempts`, `/api/v1/arena/history`, `/api/v1/battles/:id` y `/api/v1/referrals/me`. El exceso responde HTTP 429 con el código `RATE_LIMIT_EXCEEDED`. Los contadores residen en memoria local: se reinician al reiniciar el servidor y no se comparten entre varias instancias.
`GET /api/v1/auth/me` requiere la cookie de sesión y devuelve únicamente `id`, `username` y `email` de la cuenta autenticada; sin sesión responde HTTP 401.
`GET /api/v1/fighters/me` requiere sesión y devuelve `{ "fighter": null }` si la cuenta aún no creó un luchador, o el perfil propio con `id`, `username`, `name`, `level`, `xp`, `elo`, `baseStats`, `stats` (estadísticas efectivas calculadas por el servidor), `xpToNextLevel`, `wins`, `losses` y `draws`; sin sesión responde HTTP 401.
`GET /api/v1/fighters/:id` y `GET /api/v1/profiles/:username` son públicos y devuelven los campos públicos del luchador por ID o nombre de usuario, sin las estadísticas efectivas ni el umbral de XP del endpoint propio. Si el perfil no existe, responden HTTP 404. Ninguna respuesta de perfil incluye correo, `userId`, `referralCode`, contraseña ni datos de sesión.
`POST /api/v1/fighters` requiere esa misma sesión y recibe únicamente `{ "name": "Nombre" }`. El servidor valida un nombre de 3 a 18 caracteres y asigna los valores iniciales; las cuentas que ya tienen un luchador reciben HTTP 409.
`GET /api/v1/referrals/me` requiere sesión y un luchador; devuelve el `referralCode` propio y `students`, una lista de cuentas asociadas con el nombre de usuario público y, si existe, el nombre y nivel del luchador. No incluye correos, IDs ni otros datos privados. Responde HTTP 404 si la cuenta todavía no tiene luchador. El código se genera en el servidor al crear el luchador y no se acepta como entrada. La sección `/students` permite copiar un enlace de invitación y consultar esta lista.
`GET /api/v1/leaderboards?category=students` es público, paginado y ordena por la cantidad de cuentas registradas cuyo `referredByUserId` apunta al dueño del luchador; los empates se resuelven por ID. La cantidad se calcula en el servidor y no se acepta como entrada del cliente.

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
  src/              Aplicación React, estilos y recursos
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
  test/             Pruebas del servidor
render.yaml         Configuración del despliegue de prueba en Render
.env.example        Plantilla de configuración local
PROJECT_SPEC.md     Especificación funcional y técnica
ROADMAP.md          Pasos ordenados del proyecto
CURRENT_STEP.md     Único paso autorizado
```

Las reglas de juego y el acceso a datos pertenecen al servidor; React presenta la interfaz y consume la API. No hay un `package.json` en la raíz: los comandos npm se ejecutan en `client` o `server`.

## Comandos y pruebas

Ejecuta estos comandos desde la carpeta indicada. No hay actualmente un script de pruebas configurado para el cliente.

| Carpeta | Comando | Resultado |
| --- | --- | --- |
| `client` | `npm.cmd run dev` | Inicia Vite para desarrollo. |
| `client` | `npm.cmd run build` | Construye el cliente en `client/dist/`. |
| `client` | `npm.cmd run preview` | Sirve localmente el build existente. |
| `client` | `node --test test/battleAnimation.test.js` | Prueba la lectura de ataques persistidos para la animación visual. |
| `server` | `npm.cmd run dev` | Inicia el servidor con recarga al cambiar archivos. |
| `server` | `npm.cmd start` | Inicia el servidor sin modo de observación. |
| `server` | `npm.cmd test` | Ejecuta todas las pruebas con el runner integrado de Node.js. |

Las pruebas unitarias del motor y de progresión no necesitan MongoDB. Desde `server`, puedes ejecutarlas de forma aislada:

```powershell
node --test test/combatSimulation.test.js test/fighterStats.test.js test/progression.test.js
```

La suite completa incluye pruebas de API e integración que se conectan a MongoDB. Inicia MongoDB y ejecútalas contra una base de datos de pruebas separada, no contra datos que quieras conservar. En la terminal de pruebas, configura una URI exclusiva para las pruebas antes de ejecutarlas:

```powershell
Set-Location server
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/fieras_de_la_arena_test"
npm.cmd test
```

Después de las pruebas, elimina esa variable de la terminal para volver a usar el valor de `.env`:

```powershell
Remove-Item Env:MONGODB_URI
```

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

Para las reglas del producto, la arquitectura y las decisiones del juego, consulta la especificación antes de modificar el proyecto.
