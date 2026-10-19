# Fieras de la Arena — Documento de Diseño Técnico

**Versión:** 0.1 · **Estado:** borrador inicial, utilizable como fuente de verdad del proyecto  
**Idioma de la interfaz:** español  
**Stack obligatorio:** MongoDB, Express, React y Node.js (MERN)  
**Enfoque de desarrollo:** una tarea pequeña por vez mediante GitHub Copilot

---

## 1. Visión del proyecto

### 1.1 Concepto

**Fieras de la Arena** es un juego web de combates automáticos y progresión persistente. Cada persona crea un luchador, combate contra luchadores de otros jugadores, gana experiencia, sube de nivel, mejora su posición en las clasificaciones y puede atraer nuevos alumnos mediante un enlace de invitación.

La referencia de diseño es el ciclo central de *El Bruto*: crear un personaje, enviarlo a combatir sin controlar manualmente cada golpe, observar el resultado, progresar y competir en una clasificación. El proyecto tendrá identidad, nombres, textos, reglas, interfaz, personajes y recursos visuales propios. No se copiarán código, imágenes, marcas, textos ni otros recursos protegidos del juego de referencia.

### 1.2 Pilares de diseño

1. **Acción rápida:** empezar una pelea debe requerir pocas acciones.
2. **Combate automático y legible:** el jugador toma decisiones de preparación y progresión; el motor resuelve la pelea.
3. **Progresión persistente:** experiencia, nivel, estadísticas, historial y clasificación se guardan en el servidor.
4. **Competencia justa:** el cliente nunca decide el resultado de un combate ni la cantidad de recompensas.
5. **Desarrollo incremental:** cada paso de la hoja de ruta debe poder construirse, probarse y revisarse por separado.

### 1.3 Público y plataformas

- Juego web para navegador de escritorio y móvil.
- Interfaz adaptable a pantallas pequeñas.
- Primera versión en español.
- No se requiere una aplicación móvil nativa.

### 1.4 Nombre

Nombre de trabajo: **Fieras de la Arena**. Se puede cambiar más adelante sin alterar las reglas técnicas centrales.

---

## 2. Alcance del producto

### 2.1 Versión jugable inicial (MVP)

El MVP se considera terminado cuando una persona puede:

- Registrarse, iniciar sesión y cerrar sesión.
- Crear un luchador con un nombre único.
- Ver su panel, su perfil y las estadísticas de su luchador.
- Iniciar combates automáticos con un límite diario definido por el servidor.
- Ver el resultado y el registro de acciones de cada combate.
- Recibir experiencia y subir de nivel.
- Competir por ELO en combates válidos contra personas reales.
- Consultar el historial de combates.
- Ver perfiles públicos y una clasificación general.
- Compartir un enlace de invitación para incorporar alumnos.
- Usar el juego desde escritorio y móvil sin romper la interfaz.

### 2.2 Después del MVP

Estas funciones se diseñan desde el inicio para poder incorporarlas, pero no se implementan antes de que el MVP esté validado:

- Armas, armaduras, mascotas y habilidades desbloqueables.
- Elecciones de evolución al subir de nivel.
- Logros, misiones y recompensas por temporada.
- Eventos temporales y temporadas competitivas.
- Herramientas administrativas y moderación ampliada.
- Animaciones y presentación visual avanzada de los combates.

### 2.3 Fuera del alcance inicial

- Combate en tiempo real controlado directamente por los jugadores.
- Chat privado o chat global.
- Intercambio de objetos entre jugadores.
- Pagos, micropagos o contenido de pago.
- Aplicaciones nativas para Android o iOS.
- Mundo persistente en tiempo real, clanes o guerras de clanes.
- Inteligencia artificial generativa dentro del juego.

No se debe implementar nada de esta sección durante el MVP, aunque parezca fácil añadirlo.

---

## 3. Experiencia principal del jugador

### 3.1 Primer ingreso

1. La persona abre la página pública.
2. Se registra con nombre de usuario, correo y contraseña.
3. Puede introducir un código de invitación si llegó mediante el enlace de un alumno.
4. Inicia sesión y crea su luchador.
5. El servidor valida que el nombre cumpla las reglas y que esté disponible.
6. La persona entra al panel y recibe una explicación breve de cómo funciona la arena.

### 3.2 Ciclo habitual de juego

1. Abrir el panel del luchador.
2. Consultar nivel, experiencia, ELO, peleas disponibles y últimos resultados.
3. Entrar a la arena e iniciar un combate.
4. El servidor valida el límite diario, selecciona al oponente, ejecuta la simulación y guarda el resultado.
5. El cliente muestra el combate y su resultado.
6. Las recompensas válidas actualizan experiencia, nivel y ELO.
7. La persona puede consultar su historial, otros perfiles y la clasificación.

### 3.3 Alumnos e invitaciones

Cada luchador tendrá un código y enlace de invitación propios. Una nueva cuenta puede asociarse a un único referente durante el registro. La relación queda registrada de forma permanente y no puede cambiarse desde la interfaz.

Para evitar que invitar cuentas propias sea la única estrategia de progreso, el MVP no concede aumentos de estadísticas ni ELO por reclutar alumnos. La cantidad de alumnos puede mostrarse en el perfil y tener una clasificación separada. Cualquier recompensa futura deberá limitar abuso y cuentas duplicadas.

### 3.4 Casos de error visibles

La interfaz debe comunicar con claridad, sin mostrar errores técnicos internos:

- Nombre de usuario o luchador ocupado.
- Datos de registro inválidos.
- Credenciales incorrectas.
- Sesión vencida.
- No quedan combates diarios.
- No existe el luchador o perfil solicitado.
- No se pudo conectar con el servidor.
- El combate no se pudo procesar; se debe poder reintentar sin cobrar dos veces el mismo intento.

---

## 4. Reglas de juego del MVP

Los valores de balance de esta sección son **valores iniciales configurables**, no constantes repartidas por los componentes. Deben vivir en un módulo de configuración del servidor y modificarse mediante cambios explícitos y testeados.

### 4.1 Luchador inicial

Cada cuenta puede crear un único luchador en el MVP.

Campos de diseño iniciales:

- Nombre visible único, entre 3 y 18 caracteres.
- Nivel inicial: 1.
- Experiencia inicial: 0.
- ELO inicial: 1000.
- Victorias, derrotas y empates: 0.
- Estadísticas iniciales base: vida 100, ataque 10, defensa 4 y velocidad 5.
- Código de invitación único.

La validación del nombre se realiza tanto en cliente para dar respuesta rápida como en servidor para garantizar integridad. La validación del servidor es la autoridad.

### 4.2 Límite diario

- Cada cuenta dispone inicialmente de **3 intentos de arena por día**.
- El día se calcula usando UTC, no la zona horaria del navegador.
- El servidor aplica el límite de forma atómica para impedir que dos peticiones simultáneas consuman el mismo intento.
- Cada intento aceptado consume una entrada. Si el servidor rechaza la solicitud antes de iniciar una pelea, no consume la entrada.
- El cliente muestra los intentos restantes, pero no los calcula como autoridad.
- Cambiar la fecha o el reloj del navegador no debe permitir combates adicionales.

El valor 3 se podrá cambiar por configuración sin modificar la lógica de la interfaz.

### 4.3 Selección de oponente

- El servidor busca un luchador activo que no sea el propio jugador y que tenga un ELO parecido.
- Rango inicial sugerido: ±200 ELO; si no se encuentra oponente, se amplía progresivamente hasta un límite definido.
- Evitar seleccionar al mismo rival en combates consecutivos siempre que existan alternativas.
- Si no hay contrincantes reales disponibles, se puede ofrecer un rival de entrenamiento controlado por el servidor.
- Las peleas contra rivales de entrenamiento conceden una recompensa menor y **no cambian ELO ni clasificación competitiva**.
- El oponente y sus estadísticas quedan congelados en una instantánea para esa pelea. Cambios posteriores del perfil no modifican el resultado ya guardado.

### 4.4 Motor de combate

El combate se ejecuta íntegramente en el servidor. El cliente únicamente solicita comenzar una pelea y presenta el resultado recibido.

Reglas iniciales:

1. Se crea una instantánea de ambos luchadores y de la versión de las reglas.
2. Se genera una semilla aleatoria en el servidor y se ejecuta una simulación reproducible.
3. El orden de actuación se determina principalmente por velocidad; los empates se resuelven mediante la semilla.
4. Cada atacante calcula el daño multiplicando su ataque por un porcentaje entero uniforme entre 90 % y 110 % (ambos incluidos), redondeando hacia abajo y restando la defensa del rival.
5. El daño mínimo de un golpe que impacta es 1.
6. La pelea termina cuando la vida de un participante llega a 0 o se alcanza el máximo de 30 acciones.
7. Si se alcanza el límite, gana quien conserve más vida; si también hay empate, el resultado es empate.
8. El motor produce una secuencia de eventos legible: inicio, ataque, daño, derrota y resumen final.
9. El resultado, las recompensas, la semilla y la versión del motor se guardan antes de responder con éxito.

El motor debe ser una función de dominio aislada, sin dependencias de Express, React ni MongoDB. Debe poder probarse con entradas y semilla conocidas. Nunca se confiará en un resultado, daño, victoria, ELO o experiencia calculados por el navegador.

### 4.5 Recompensas y niveles

Reglas iniciales de balance:

- Victoria PvP válida: 25 XP.
- Derrota PvP válida: 10 XP.
- Empate PvP válido: 15 XP.
- Combate contra rival de entrenamiento: 5 XP, independientemente del resultado.
- Una pelea solo puede otorgar recompensas una vez.
- Los combates de entrenamiento no otorgan ELO.

Experiencia necesaria para el siguiente nivel:

`XP_para_siguiente_nivel = 100 + 25 × (nivel_actual - 1)`

Al alcanzar el umbral, se resta el coste correspondiente y se avanza de nivel. Si la XP acumulada cubre varios umbrales, se suben varios niveles; esto debe estar cubierto por pruebas.

En el MVP, cada nivel aumenta automáticamente las estadísticas según una regla definida en una única función del servidor. El balance inicial propuesto por nivel es: +5 vida máxima por cada nivel después del nivel 1, +1 ataque en los niveles 3, 5, 7… y +1 defensa en los niveles 4, 7, 10… La velocidad no sube automáticamente durante el MVP para mantener predecible el orden de combate.

Las estadísticas derivadas deben calcularse desde el nivel y los atributos base mediante una función única. No almacenar copias calculadas que puedan quedar desincronizadas sin una razón técnica documentada.

### 4.6 ELO

Usar una fórmula Elo estándar para partidas PvP válidas:

- ELO inicial: 1000.
- Factor K inicial: 32.
- Victoria: puntuación 1; empate: 0.5; derrota: 0.
- La expectativa se calcula a partir de los ELO anteriores al combate.
- Actualizar a ambos participantes en el mismo proceso de dominio.
- Guardar el ELO anterior, cambio y ELO posterior para cada participante.
- Una pelea contra bot, una pelea de entrenamiento o una pelea duplicada no modifica ELO.

El cliente recibe el ELO final calculado por el servidor. No puede enviarlo como valor editable.

### 4.7 Historial

Cada pelea guardada debe permitir ver:

- Fecha y hora en UTC, presentada en la zona horaria local del navegador.
- Nombre, nivel y ELO de ambos luchadores en el momento de la pelea.
- Ganador, perdedor o empate.
- Tipo de pelea: PvP competitiva o entrenamiento.
- Secuencia de acciones.
- XP obtenida y cambio de ELO de cada participante.
- Versión del motor de combate.

---

## 5. Arquitectura técnica

### 5.1 Stack

- **Frontend:** React + Vite, JavaScript, React Router y CSS adaptable.
- **Backend:** Node.js + Express, JavaScript con módulos ES.
- **Base de datos:** MongoDB con Mongoose.
- **Autenticación:** sesiones de servidor con cookie `httpOnly`, `secure` en producción y `sameSite` apropiado; almacenar sesiones en MongoDB.
- **Hash de contraseña:** bcrypt o bcryptjs; jamás texto plano.
- **Validación:** esquema de validación en el backend para todos los datos externos.
- **Pruebas:** Vitest para frontend y pruebas unitarias del dominio; pruebas de API e integración donde corresponda.
- **Control de versiones:** Git.
- **Gestión de dependencias:** npm.

No añadir Redux, colas, microservicios, WebSockets ni otra infraestructura por anticipado. React Context puede manejar la sesión al comienzo; incorporar herramientas adicionales únicamente si un requisito real lo justifica.

### 5.2 Estructura de carpetas objetivo

La estructura crecerá gradualmente; no se deben crear todos estos archivos de una sola vez.

```text
fieras-de-la-arena/
├── .github/
│   └── copilot-instructions.md
├── client/
│   ├── index.html
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── context/
│       ├── styles/
│       ├── App.jsx
│       └── main.jsx
├── server/
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── game-engine/
│       ├── validators/
│       ├── utils/
│       └── app.js
├── docs/
├── PROJECT_SPEC.md
├── ROADMAP.md
├── CURRENT_STEP.md
├── README.md
└── .gitignore
```

Responsabilidades:

- `pages/`: pantallas asociadas a rutas.
- `components/`: elementos visuales reutilizables.
- `api/`: llamadas HTTP; no contiene reglas de combate.
- `models/`: modelos Mongoose y sus índices.
- `routes/`: asociación entre rutas HTTP y controladores.
- `controllers/`: traducción entre petición HTTP y resultado de servicios.
- `services/`: casos de uso, transacciones lógicas y coordinación.
- `game-engine/`: reglas puras de combate, progreso y ELO; sin HTTP ni acceso directo a la base de datos.
- `validators/`: validación de entradas.
- `middleware/`: sesión, autenticación, límites de uso y manejo de errores.

### 5.3 Separación de responsabilidades

- El frontend representa la interfaz y solicita operaciones.
- Express valida la sesión, los parámetros y permisos.
- Los servicios ejecutan casos de uso.
- El motor de juego calcula combate y progresión mediante funciones de dominio.
- Mongoose persiste las entidades.
- Ninguna regla importante de juego debe existir únicamente en React.

### 5.4 Comunicación

- API REST versionada bajo `/api/v1`.
- Respuestas JSON consistentes.
- Códigos HTTP apropiados (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`, `500`).
- Errores públicos con un código estable y mensaje entendible; detalles de excepción solo en logs del servidor.
- La aplicación debe exponer un endpoint de salud para comprobar que Express está activo y, en una fase posterior, el estado de MongoDB.

Formato orientativo de error:

```json
{
  "error": {
    "code": "DAILY_BATTLES_EXHAUSTED",
    "message": "Ya utilizaste los combates disponibles por hoy."
  }
}
```

No devolver trazas, contraseñas, secretos, tokens de sesión ni datos internos en las respuestas.

---

## 6. Modelo de datos inicial

Los nombres concretos de propiedades podrán adaptarse al estilo del código, pero no se cambiará su significado sin actualizar esta especificación.

### 6.1 User

Representa una cuenta y sus credenciales.

- `_id`
- `username` normalizado y único
- `email` normalizado y único
- `passwordHash`
- `role`: `user` o `admin`
- `status`: `active` o `suspended`
- `referredByUserId` opcional; referencia única asignada en el registro
- `createdAt`, `updatedAt`, `lastLoginAt`

Reglas:

- `username` se normaliza quitando espacios al inicio y al final y convirtiéndolo a minúsculas; admite de 3 a 24 letras ASCII, números o guion bajo.
- `email` se normaliza quitando espacios al inicio y al final y convirtiéndolo a minúsculas; debe tener formato de correo válido y no superar 254 caracteres.
- La contraseña debe tener entre 8 y 72 bytes UTF-8; se conserva exactamente como se envía y se almacena únicamente su hash bcrypt.
- Nunca almacenar ni devolver la contraseña original.
- Nunca devolver `passwordHash` al frontend.
- Índices únicos para nombre y correo normalizados.
- Las reglas sobre formato, longitud y caracteres se validan en servidor.

### 6.2 Fighter

Representa al personaje jugable.

- `_id`
- `userId` único
- `name` normalizado y único
- `level`, `xp`, `elo`
- `baseStats`: vida, ataque, defensa y velocidad
- contadores de victorias, derrotas y empates
- `referralCode` único
- `createdAt`, `updatedAt`

Evitar guardar estadísticas derivadas duplicadas salvo que exista una necesidad de rendimiento demostrada. Si se almacenan, documentar cómo se recalculan y prueban.

### 6.3 Battle

Registro inmutable del resultado.

- `_id`
- `battleType`: `pvp` o `training`
- `status`: `completed` (los errores anteriores a finalizar no deben quedar como victorias)
- instantáneas de ambos luchadores: id, nombre, nivel, ELO y estadísticas usadas
- `winnerFighterId` opcional; empate si no hay ganador
- `seed` del motor y `engineVersion`
- `events` ordenados
- resultado de XP y ELO de ambos
- `createdAt`
- `requesterFighterId` y `requestId` para identificar de forma idempotente la petición de un participante

La combinación `requesterFighterId + requestId` debe ser única. La creación de la pelea y la actualización de ambos luchadores se confirman en una única transacción; si falla cualquiera de las escrituras, no se conserva la pelea ni se aplican recompensas.

El historial no debe depender de consultar el estado actual de un luchador para explicar una pelea anterior.

### 6.4 DailyActivity

Control del límite diario.

- `_id`
- `userId`
- `dateKey` como fecha UTC en formato estable `YYYY-MM-DD`
- `battlesUsed`
- `requestIds` reservados ese día para no consumir más de un intento al repetir la misma solicitud
- identificadores de las peleas aceptadas, cuando sea útil para idempotencia
- `createdAt`, `updatedAt`

Índice único compuesto por `userId + dateKey`. Las actualizaciones para reservar un intento deben ser atómicas y verificar que aún hay disponibilidad.

### 6.5 Relaciones de invitación

En el MVP puede representarse con `User.referredByUserId` y los códigos de invitación de `Fighter`. Si más adelante se requieren estadísticas, recompensas, prevención de abuso o auditoría, migrar a una colección `Referral` documentada sin alterar silenciosamente el historial.

### 6.6 Índices previstos

- User: `username` único, `email` único.
- Fighter: `userId` único, `name` único, `referralCode` único, índice por ELO descendente.
- Battle: fecha descendente, participantes + fecha, e idempotencia única cuando aplique.
- DailyActivity: `userId + dateKey` único.

Crear cada índice en el paso de desarrollo de su modelo. No generar modelos, índices o colecciones no necesarios para el paso activo.

---

## 7. API REST prevista

Estas rutas son el contrato objetivo, no una orden de implementarlas todas de inmediato. Cada grupo se desarrolla únicamente cuando lo indique `ROADMAP.md` y `CURRENT_STEP.md`.

| Método | Ruta | Requiere sesión | Propósito |
|---|---|---:|---|
| `GET` | `/api/v1/health` | No | Verificar que el servidor responde |
| `POST` | `/api/v1/auth/register` | No | Crear cuenta; aceptar invitación opcional desde la etapa 7 |
| `POST` | `/api/v1/auth/login` | No | Iniciar sesión |
| `POST` | `/api/v1/auth/logout` | Sí | Destruir la sesión |
| `GET` | `/api/v1/auth/me` | Sí | Consultar cuenta autenticada |
| `POST` | `/api/v1/fighters` | Sí | Crear el luchador de la cuenta |
| `GET` | `/api/v1/fighters/me` | Sí | Obtener el luchador propio |
| `GET` | `/api/v1/fighters/:id` | No | Ver perfil público por ID |
| `GET` | `/api/v1/profiles/:username` | No | Ver perfil público por nombre de usuario |
| `GET` | `/api/v1/arena/attempts` | Sí | Consultar intentos diarios restantes |
| `POST` | `/api/v1/arena/fight` | Sí | Reservar intento y resolver un combate |
| `GET` | `/api/v1/arena/history` | Sí | Listar combates propios con paginación |
| `GET` | `/api/v1/battles/:id` | Condicional | Ver un combate si el solicitante es participante o el contenido es público |
| `GET` | `/api/v1/leaderboards` | No | Consultar clasificación paginada |
| `GET` | `/api/v1/referrals/me` | Sí | Obtener enlace y lista/resumen de alumnos |

Requisitos de API:

- Validar toda entrada del cliente en el servidor.
- Aplicar límites a registro, inicio de sesión y solicitudes de combate.
- Usar paginación en historiales y clasificaciones.
- No aceptar `userId`, ELO, XP, nivel, ganador ni estadísticas finales desde el cliente como datos autoritativos.
- Evitar respuestas que permitan enumerar correos o averiguar si una contraseña es correcta.
- Comprobar permisos en servidor, no solo ocultar botones en React.

`GET /api/v1/arena/attempts` devuelve `{ dateKey, limit, used, remaining }`, con el día calculado en UTC. `POST /api/v1/arena/fight` recibe únicamente `{ requestId }`; el rival y el resultado son decididos por el servidor. Repetir la misma clave para el mismo luchador devuelve el combate persistido sin consumir otro intento ni aplicar recompensas nuevamente. `GET /api/v1/arena/history` acepta `page` (por defecto `1`) y `limit` (por defecto `20`, máximo `50`), y devuelve `{ battles, pagination: { page, limit, totalItems, totalPages } }` ordenado por fecha descendente.

El registro acepta únicamente `username`, `email` y `password`. Un registro correcto devuelve HTTP 201 con `id`, `username` y `email` públicos, sin iniciar sesión. Los conflictos de nombre o correo devuelven el mismo error HTTP 409 para no distinguir cuál valor está ocupado.

El inicio de sesión acepta únicamente `identifier` y `password`; `identifier` puede ser el nombre de usuario o el correo electrónico registrado.

---

## 8. Frontend y navegación

### 8.1 Rutas de interfaz previstas

- `/` — página inicial pública.
- `/register` — registro.
- `/login` — inicio de sesión.
- `/create-fighter` — creación del personaje; solo si la cuenta todavía no tiene uno.
- `/dashboard` — resumen del propio luchador y accesos principales.
- `/arena` — intentos restantes y acción para iniciar una pelea.
- `/battles/:id` — resultado y secuencia de combate.
- `/history` — historial propio.
- `/profile/:username` — perfil público.
- `/leaderboards` — clasificación.
- `/students` — enlaces de invitación y alumnos asociados.

Estas rutas se añaden gradualmente. No crear pantallas vacías para todas al iniciar el proyecto.

### 8.2 Componentes de interfaz futuros

- `AppLayout`, `Header`, `Navigation`.
- `AuthForm`, `FormField`, `ErrorMessage`.
- `FighterSummary`, `FighterStats`, `XpProgress`.
- `BattleAvailability`, `BattleResult`, `BattleEventLog`.
- `BattleHistoryList`, `LeaderboardTable`, `StudentList`.
- `LoadingState`, `EmptyState`, `ErrorState`.

Crear un componente reutilizable cuando exista una necesidad concreta, no solo porque figure en esta lista.

### 8.3 Experiencia y accesibilidad

- Estados de carga, éxito, error y ausencia de datos claramente visibles.
- Formularios con etiquetas, mensajes de validación y navegación por teclado.
- Contraste legible y foco de teclado visible.
- No depender únicamente del color para comunicar victoria o derrota.
- Deshabilitar botones durante peticiones para reducir dobles envíos; mantener la idempotencia en el servidor de todos modos.
- Adaptar tablas, navegación y secuencias de combate a pantallas pequeñas.

---

## 9. Seguridad, integridad y abuso

### 9.1 Autenticación y sesiones

- Contraseñas almacenadas únicamente como hash seguro.
- Sesiones persistidas en MongoDB; no usar `localStorage` para guardar identificadores de sesión.
- Cookie `httpOnly`; `secure` en producción; configurar `sameSite`, `trust proxy` y CORS de acuerdo con el despliegue real.
- Regenerar el ID de sesión al autenticar y destruir la sesión al cerrar sesión.
- No exponer secretos en el repositorio. Mantener un `.env.example` con nombres y valores ficticios.

### 9.2 Validación y autorización

- Rechazar propiedades no admitidas en las operaciones sensibles.
- Normalizar identificadores públicos y nombres antes de comprobar unicidad.
- Escapar o tratar como texto cualquier nombre visible del jugador.
- Limitar longitud de cadenas, tamaño del cuerpo y paginación máxima.
- Aplicar protección ante fuerza bruta y exceso de peticiones.
- No permitir que un usuario cambie sus propias recompensas, ELO, rol o relación de invitación mediante una petición manipulada.

### 9.3 Combates sin trampas

- Simulación y cálculo de recompensas solo en servidor.
- Semilla generada por el servidor y registro de `engineVersion`.
- Instantáneas de participantes.
- Idempotencia para evitar duplicar recompensas al repetir una petición.
- Operaciones de actualización relacionadas ejecutadas de forma coherente. Si se necesita transacción MongoDB, comprobar primero los requisitos del entorno; no fingir atomicidad.
- Los bots no alteran ELO.
- Registrar errores operativos sin exponer secretos ni datos innecesarios.

### 9.4 Privacidad

- El perfil público solo muestra datos de juego definidos expresamente como públicos.
- No mostrar correo, hash de contraseña, identificadores de sesión ni detalles privados.
- Diseñar borrado o desactivación de cuentas en una fase posterior de privacidad y mantenimiento; documentar cualquier limitación antes de publicar.

---

## 10. Configuración y ejecución local

La aplicación debe documentar cómo arrancar el cliente, servidor y base de datos. Los nombres definitivos de scripts se fijan cuando se creen los proyectos correspondientes.

Variables previstas:

```dotenv
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/fieras_de_la_arena
SESSION_SECRET=replace_with_a_long_random_local_secret
```

Reglas:

- `.env` no se versiona.
- `.env.example` sí se versiona, sin secretos reales.
- Verificar configuración al iniciar y fallar con mensaje claro si falta una variable obligatoria.
- Documentar requisitos de versiones de Node.js y npm una vez comprobadas en el entorno de desarrollo.
- No agregar Docker, CI/CD ni despliegue hasta que la aplicación local esté probada y se llegue a la tarea correspondiente.

---

## 11. Pruebas y criterios de calidad

### 11.1 Pruebas del dominio

El motor y las funciones de progresión deben probarse sin levantar Express ni conectarse a MongoDB.

Casos mínimos:

- Mismo estado inicial + misma semilla = mismo resultado y mismos eventos.
- La pelea termina y nunca supera el máximo de acciones.
- La vida no se reduce por debajo de cero en los valores presentados.
- Daño mínimo de 1 cuando se produce un impacto.
- Nivel sube al alcanzar el umbral correcto.
- Una cantidad de XP que cubra varios niveles los procesa correctamente.
- ELO se actualiza correctamente para victoria, derrota y empate.
- Entrenamiento no modifica ELO.
- Pelea duplicada no concede recompensas por segunda vez.

### 11.2 Pruebas de API e integración

- Registro válido y rechazo de datos inválidos.
- Nombre y correo duplicados.
- Inicio y cierre de sesión.
- Rutas privadas sin sesión devuelven `401`.
- Un usuario no puede crear un segundo luchador durante el MVP.
- Límite diario y peticiones simultáneas.
- No se puede modificar la identidad del luchador objetivo ni enviar recompensas desde el cliente.
- Perfiles inexistentes y paginación inválida.

### 11.3 Pruebas de interfaz

- Formularios con datos válidos e inválidos.
- Sesión persistente al recargar y limpieza al cerrar sesión.
- Estados de carga y error visibles.
- Adaptación a ancho móvil.
- Un usuario que no tiene luchador es enviado al flujo de creación; uno que ya lo tiene no puede repetirlo.

### 11.4 Definición general de “terminado”

Una tarea no se considera completa porque el código “parece correcto”. Debe:

1. Cumplir los criterios de aceptación de ese paso.
2. Ejecutar las pruebas o verificaciones pertinentes.
3. No romper funciones que ya estaban comprobadas.
4. Informar archivos modificados, comandos ejecutados y resultados reales.
5. Declarar cualquier prueba que no pudo ejecutarse y el motivo.
6. Detenerse sin implementar el paso siguiente.

---

## 12. Despliegue y mantenimiento

El despliegue se aborda después de tener autenticación, flujo de combate, persistencia y pruebas integradas. Antes de publicar:

- Configurar secretos desde el proveedor de hosting.
- Servir HTTPS.
- Limitar CORS al origen real.
- Configurar cookies seguras y proxy correctamente.
- Configurar MongoDB con autenticación, permisos mínimos y copias de seguridad.
- Evitar incluir datos personales o secretos en logs.
- Probar migraciones/índices y recuperación ante errores.
- Definir una política de manejo de errores y una comprobación de salud.
- Verificar que el juego funcione con dos cuentas distintas en producción de prueba.

No fijar proveedor ni desplegar hasta que el usuario lo decida en el paso correspondiente.

---

## 13. Decisiones tomadas y temas revisables

### Decisiones iniciales

- El producto es una web de combates automáticos, no un juego de acción en tiempo real.
- Un luchador por cuenta durante el MVP.
- Tres intentos diarios según UTC.
- Experiencia, nivel y ELO calculados por el servidor.
- Rival de entrenamiento de respaldo cuando no haya jugadores; no puntúa ELO.
- Registro de usuarios y perfiles públicos.
- Invitaciones/alumnos con relación persistente, sin bonus competitivo en el MVP.
- Armas, mascotas y habilidades complejas se añaden después de validar el bucle básico.
- Las decisiones aún no implementadas no autorizan a Copilot a anticipar trabajo.

### Revisiones futuras permitidas

Se puede ajustar balance, estética, nombre, estructura de recompensas y alcance. Todo cambio que afecte arquitectura, modelos, API o reglas debe actualizar este documento y las pruebas relacionadas antes de implementarse.

---

## 14. Regla final del proyecto

**La especificación define lo que se construye; `ROADMAP.md` define el orden; `CURRENT_STEP.md` define la única tarea autorizada ahora; `.github/copilot-instructions.md` define cómo debe trabajar Copilot.** Si hay una contradicción o falta un requisito importante para el paso activo, Copilot debe detenerse y señalarla en vez de improvisar o adelantarse.
