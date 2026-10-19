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

El cliente React con Vite está en `client/` e incluye una página inicial y pantallas de registro e inicio de sesión conectadas a la API. El servidor Express está en `server/`, se conecta a MongoDB con Mongoose y expone `GET /api/v1/health`. Ya cuenta con manejo común de errores, un modelo `User` con índices únicos, endpoints de registro, login, logout y consulta de la sesión autenticada, y middleware de autenticación. Las sesiones persistentes se almacenan en MongoDB. El paso activo es `2.6`, definido en `CURRENT_STEP.md`: integrar el estado de sesión en React y proteger rutas según el estado confirmado por el backend. Todavía no se ha integrado el estado de sesión del cliente ni hay sistemas de juego implementados.

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
