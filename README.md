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

El cliente React con Vite incluye registro e inicio de sesión conectados a la API, sesión persistente, creación de luchador y rutas protegidas. También están implementados el dashboard del jugador, Arena, resultados e historial de combates, perfiles públicos y clasificación. El servidor Express usa MongoDB con Mongoose y proporciona autenticación, gestión de luchadores, combates e intentos diarios. Los combates se simulan y persisten en el servidor.

**Paso activo: 7.1 — Crear generación y consulta de código de invitación**. El paso anterior, 6.3, fue aprobado por el usuario.

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
`GET /api/v1/fighters/me` requiere sesión y devuelve `{ "fighter": null }` si la cuenta aún no creó un luchador, o el perfil propio con `id`, `username`, `name`, `level`, `xp`, `elo`, `baseStats`, `stats` (estadísticas efectivas calculadas por el servidor), `xpToNextLevel`, `wins`, `losses` y `draws`; sin sesión responde HTTP 401.
`GET /api/v1/fighters/:id` y `GET /api/v1/profiles/:username` son públicos y devuelven los campos públicos del luchador por ID o nombre de usuario, sin las estadísticas efectivas ni el umbral de XP del endpoint propio. Si el perfil no existe, responden HTTP 404. Ninguna respuesta de perfil incluye correo, `userId`, `referralCode`, contraseña ni datos de sesión.
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
