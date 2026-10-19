# Fieras de la Arena

Juego web de combates automáticos inspirado en el ciclo de crear luchador, combatir, progresar y competir en una clasificación. Proyecto original construido con MongoDB, Express, React y Node.js.

## Documentos del proyecto

- [`PROJECT_SPEC.md`](PROJECT_SPEC.md): visión, reglas de juego, arquitectura, seguridad, datos, API y criterios generales.
- [`ROADMAP.md`](ROADMAP.md): etapas y tareas ordenadas desde cero hasta una versión 1.0.
- [`CURRENT_STEP.md`](CURRENT_STEP.md): única tarea autorizada para desarrollar ahora.
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md): reglas permanentes para que Copilot no se adelante ni modifique áreas ajenas a la tarea.

## Regla de trabajo

Desarrollar una sola tarea de `ROADMAP.md` por iteración. Verificar sus criterios, informar los resultados y detenerse. No iniciar el siguiente paso hasta que se cambie manualmente `CURRENT_STEP.md`.

## Estado actual

El cliente React con Vite está en `client/` e incluye una página inicial, pantallas de registro e inicio de sesión conectadas a la API, un contexto que carga el estado de sesión desde el backend y el flujo protegido de creación de luchador. Una cuenta sin luchador es dirigida a `/create-fighter`; una cuenta que ya tiene uno no puede volver a esa pantalla, incluso al recargar. El `/dashboard` protegido muestra el resumen del luchador y permite cerrar sesión; `/profile/:username` muestra el perfil público. El servidor Express está en `server/`, se conecta a MongoDB con Mongoose y expone `GET /api/v1/health`. También cuenta con manejo común de errores, modelos `User`, `Fighter`, `Battle` y `DailyActivity`, middleware de autenticación, endpoints de autenticación y sesiones persistentes almacenadas en MongoDB. El modelo `Battle` conserva instantáneas de los participantes, eventos, semilla, versión del motor y resultados para reconstruir peleas previas aunque cambien los luchadores; sus pruebas de persistencia están incluidas en la suite del servidor. Los endpoints `GET /api/v1/fighters/me`, `GET /api/v1/fighters/:id` y `GET /api/v1/profiles/:username` devuelven únicamente datos de cuenta y juego definidos como públicos; `POST /api/v1/fighters` crea un luchador con valores iniciales del servidor y rechaza campos adicionales. El servidor centraliza el cálculo determinista de estadísticas derivadas por nivel y cuenta con pruebas unitarias para esa fórmula; también centraliza las funciones puras de XP, nivel y ELO con pruebas para recompensas, subidas de nivel y entrenamiento. El motor documenta los contratos de entrada, instantáneas, eventos y resultado e implementa una simulación pura reproducible a partir de una semilla; sus pruebas cubren determinismo, daño mínimo, orden de turno, fin por KO, máximo de 30 acciones y empates. El caso de uso del paso 4.6 valida participantes y coordina simulación, persistencia y recompensas dentro de una transacción MongoDB, con idempotencia por solicitante y clave. El paso 5.1 implementa `DailyActivity` y reserva atómicamente un máximo inicial de tres intentos diarios según UTC. El paso 5.2 implementa la selección de rival PvP real con rangos ELO configurados de ±200, ±400, ±800 y ±1600. El paso 5.3 implementa un rival sintético de entrenamiento de nivel 1 si no se encuentra un rival PvP; la pelea se registra como `training`, concede 5 XP al jugador y no modifica ELO. El paso 5.4 expone `GET /api/v1/arena/attempts`, `POST /api/v1/arena/fight` y `GET /api/v1/arena/history`; la reserva diaria es idempotente por clave, y el historial tiene paginación. El paso activo es el 5.5: crear la pantalla Arena, que aún no está implementada. Las pantallas de resultado e historial corresponden a los pasos 5.6 y 5.7 y aún no están implementadas.

## Requisitos

- Node.js `20.19+` o `22.12+` (requisito de la versión actual de Vite).
- npm.
- En el entorno donde se comprobó el proyecto: Node.js `v24.20.0` y npm `11.19.0`.

## Ejecución local en Windows PowerShell

Abre una terminal en la raíz del repositorio y crea la configuración local a partir del ejemplo:

```powershell
Copy-Item .env.example .env
```

El archivo `.env` está ignorado por Git. El ejemplo no contiene credenciales reales: reemplaza `SESSION_SECRET` por un valor aleatorio de al menos 32 bytes y no uses el valor de ejemplo. El servidor necesita `MONGODB_URI` y una instancia local de MongoDB en ejecución; si no puede conectarse, muestra un error comprensible y no empieza a escuchar. Las sesiones se guardan en MongoDB, usan una cookie `httpOnly` con `sameSite=lax` y activan `secure` en producción. `CLIENT_URL` queda documentada para pasos posteriores.

El endpoint `POST /api/v1/auth/login` recibe `identifier` (nombre de usuario o correo) y `password`. `POST /api/v1/auth/logout` destruye una sesión iniciada.
`GET /api/v1/auth/me` requiere la cookie de sesión y devuelve únicamente `id`, `username` y `email` de la cuenta autenticada; sin sesión responde HTTP 401.
`GET /api/v1/fighters/me` requiere sesión y devuelve `{ "fighter": null }` si la cuenta aún no creó un luchador, o el perfil propio con `id`, `username`, `name`, `level`, `xp`, `elo`, `baseStats`, `wins`, `losses` y `draws`; sin sesión responde HTTP 401.
`GET /api/v1/fighters/:id` y `GET /api/v1/profiles/:username` son públicos y devuelven esos mismos campos del luchador por ID o nombre de usuario. Si el perfil no existe, responden HTTP 404. Ninguna respuesta de perfil incluye correo, `userId`, `referralCode`, contraseña ni datos de sesión.
`POST /api/v1/fighters` requiere esa misma sesión y recibe únicamente `{ "name": "Nombre" }`. El servidor valida un nombre de 3 a 18 caracteres y asigna los valores iniciales; las cuentas que ya tienen un luchador reciben HTTP 409.

En una primera terminal, instala e inicia el cliente:

```powershell
Set-Location client
npm.cmd install
npm.cmd run dev
```

Abre la URL local que indique Vite (normalmente `http://localhost:5173`).

En una segunda terminal, vuelve a la raíz del repositorio, instala e inicia el servidor:

```powershell
Set-Location server
npm.cmd install
npm.cmd run dev
```

El servidor lee el `.env` de la raíz del repositorio mediante la opción `--env-file` de Node.js. Para comprobar el endpoint de salud desde otra terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
```

La respuesta debe incluir `status` con valor `ok` y `database` con valor `connected`. Si MongoDB deja de estar disponible, el endpoint devuelve HTTP 503 y refleja `database: "disconnected"`. El cliente y el servidor se ejecutan en terminales independientes; para detener cada uno, pulsa `Ctrl+C` en su terminal.

## Tecnología prevista

- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- Sesiones almacenadas en MongoDB
- JavaScript con módulos ES

Consulta la especificación antes de tomar decisiones de implementación.
