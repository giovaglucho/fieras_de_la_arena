# Fieras de la Arena — Documento de Diseño Técnico

**Versión:** 0.1 · **Estado:** vigente para el MVP; reglas de producto de la expansión aprobadas en 4.8. Los valores de balance pendientes no son definitivos.
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

El MVP vigente comenzó con un luchador por cuenta y selección automática de rival. Esas dos restricciones describen la versión ya construida, no el contrato de la expansión: la etapa 10 las sustituye por varios luchadores por cuenta y desafíos dirigidos por el jugador, según las reglas de la sección 4.8. No se borran ni reinician los datos existentes.

### 2.2 Después del MVP

Estas funciones se diseñan desde el inicio para poder incorporarlas, pero no se implementan antes de que el MVP esté validado:

- Armas, armaduras, mascotas y habilidades desbloqueables.
- Elecciones de evolución al subir de nivel.
- Varios luchadores por cuenta, selección del luchador propio activo y perfiles privados opcionales.
- Desafíos dirigidos a luchadores públicos elegidos por el jugador.
- Atributos iniciales aleatorios y progresión aleatoria reproducible.
- Dojos con relaciones de maestro y aprendiz.
- Logros, misiones y recompensas por temporada.
- Eventos temporales y temporadas competitivas.
- Herramientas administrativas y moderación ampliada.
- Animaciones y presentación visual avanzada de los combates; la presentación básica de los eventos guardados forma parte del MVP.

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
4. El servidor inicia su sesión y la persona crea su luchador sin volver a ingresar sus credenciales.
5. El servidor valida que el nombre cumpla las reglas y que esté disponible.
6. La persona entra al panel y recibe una explicación breve de cómo funciona la arena.

### 3.2 Ciclo habitual de juego

1. Abrir el panel del luchador activo; cambiar a otro luchador propio cuando se desee.
2. Consultar nivel, experiencia, ELO, peleas disponibles y últimos resultados del luchador activo.
3. Entrar a la arena, elegir un luchador público disponible y desafiarlo.
4. El servidor valida propiedad, privacidad, estado, rango, repetición y cupo diario; después ejecuta la simulación y guarda el resultado.
5. El cliente muestra el combate y su resultado.
6. Las recompensas válidas actualizan experiencia, nivel, ELO y, cuando corresponda, los desbloqueos del luchador participante.
7. La persona puede consultar su historial, otros perfiles públicos y la clasificación; los luchadores privados solo son visibles para su dueño.

### 3.3 Alumnos e invitaciones

Cada luchador tendrá un código y enlace de invitación propios. El código identifica al luchador referente, pero la nueva cuenta queda asociada una sola vez al dueño de ese luchador, no al personaje ni a cada luchador que posea esa cuenta. La relación queda registrada de forma permanente y no puede cambiarse desde la interfaz; es distinta de la relación de dojo entre luchadores.

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

## 4. Reglas de juego

Las secciones 4.1–4.7 describen las reglas y valores iniciales del MVP. Cuando una regla se contradiga con la sección 4.8, se conserva como comportamiento del MVP y la regla de 4.8 es el contrato de la expansión de la etapa 10. Los valores de balance son configurables en el servidor y solo se modifican mediante cambios explícitos y probados.

### 4.1 Luchador inicial del MVP

En el MVP vigente cada cuenta puede crear un único luchador. Esa restricción queda sustituida para la expansión por el ciclo de vida descrito en 4.8.

Los valores fijos de estadísticas de esta sección pertenecen al MVP. En la expansión se sustituyen por la generación aleatoria de las cuatro estadísticas descrita en 4.8.

Campos de diseño iniciales:

- Nombre visible único, entre 3 y 18 caracteres.
- Nivel inicial: 1.
- Experiencia inicial: 0.
- ELO inicial: 1000.
- Victorias, derrotas y empates: 0.
- Estadísticas iniciales base: vida 100, ataque 10, defensa 4 y velocidad 5.
- Código de invitación único.

La validación del nombre se realiza tanto en cliente para dar respuesta rápida como en servidor para garantizar integridad. La validación del servidor es la autoridad.

### 4.2 Límite diario del MVP

- Cada cuenta dispone inicialmente de **3 intentos de arena por día**.
- El día se calcula usando UTC, no la zona horaria del navegador.
- El servidor aplica el límite de forma atómica para impedir que dos peticiones simultáneas consuman el mismo intento.
- Cada intento aceptado consume una entrada. Si el servidor rechaza la solicitud antes de iniciar una pelea, no consume la entrada.
- El cliente muestra los intentos restantes, pero no los calcula como autoridad.
- Cambiar la fecha o el reloj del navegador no debe permitir combates adicionales.

El valor 3 se podrá cambiar por configuración sin modificar la lógica de la interfaz. Para la expansión, la cuota aprobada es por luchador y se define en 4.8; no se acumula ni comparte entre luchadores de una cuenta.

### 4.3 Selección de oponente del MVP

- El servidor busca un luchador activo que no sea el propio jugador y que tenga un ELO parecido.
- Rango inicial sugerido: ±200 ELO; si no se encuentra oponente, se amplía progresivamente hasta un límite definido.
- Evitar seleccionar al mismo rival en combates consecutivos siempre que existan alternativas.
- Si no hay contrincantes reales disponibles, se puede ofrecer un rival de entrenamiento controlado por el servidor.
- Las peleas contra rivales de entrenamiento conceden una recompensa menor y **no cambian ELO ni clasificación competitiva**.
- El oponente y sus estadísticas quedan congelados en una instantánea para esa pelea. Cambios posteriores del perfil no modifican el resultado ya guardado.

La selección automática y el reemplazo por un rival de entrenamiento no se aplican a los desafíos dirigidos de la expansión: el servidor no sustituye silenciosamente al rival elegido. Se conservan las reglas de entrenamiento para el flujo MVP que ya las utiliza.

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

En la expansión, la selección de la estadística que crece y el desbloqueo aleatorio siguen las reglas de 4.8; no se extrapola la regla fija del MVP.

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

### 4.8 Contrato aprobado para la expansión de luchadores

Esta sección resuelve las reglas de producto de la etapa 10. Los porcentajes, rangos numéricos de atributos y magnitudes exactas de recompensas que se marcan como pendientes no son valores autorizados para implementar: deben fijarse con pruebas de balance en los pasos correspondientes.

#### Cuentas, creación y ciclo de vida

- Una cuenta puede crear tantos luchadores como necesite; no existe un máximo de juego por cuenta. La creación sí se protege con límites técnicos configurables, medidos por cuenta y por IP, respuestas de limitación de frecuencia y revisión de patrones automatizados. Los umbrales se fijarán tras medir carga y abuso; no se rechaza una creación legítima solo por alcanzar un cupo permanente.
- Cada luchador tiene un nombre visible único globalmente, validado en el servidor. El nombre del luchador no es el nombre de usuario ni la contraseña de la cuenta.
- Al crear un luchador, este pasa a ser el luchador activo seleccionado de su dueño. La cuenta tiene como máximo un luchador seleccionado para su panel y para iniciar desafíos; esta selección es distinta del estado de elegibilidad `active`/`suspended`. Cambiar la selección no cambia la propiedad, la elegibilidad ni los registros de otros luchadores.
- Un luchador nuevo es público y elegible para desafíos de forma predeterminada. Su dueño puede cambiarlo a privado. Un luchador privado no aparece en búsquedas, perfiles públicos, clasificaciones ni puede recibir desafíos; el dueño autenticado mantiene acceso a su ficha e historial.
- La privacidad no exige ni admite una contraseña separada para el luchador. La sesión de la cuenta y la autorización del servidor son los únicos controles de acceso.
- La falta de conexión del dueño no vuelve inactivo al luchador: los combates son asíncronos. Para el desafío, “inactivo” significa que el luchador o su cuenta tienen un estado no elegible (por ejemplo, suspendido por moderación); esos luchadores no se listan ni aceptan desafíos. Cambiar a privado los excluye por la misma vía. La especificación no introduce eliminación de luchadores ni caducidad automática.
- Un perfil público solo muestra los campos públicos de juego definidos en esta especificación. Hacerlo privado deja de exponerlo en solicitudes posteriores, sin borrar snapshots ni registros históricos.

#### Desafíos y cupos

- Desafiar significa que la cuenta inicia una pelea usando el luchador propio actualmente seleccionado y elige como rival un luchador elegible de otra cuenta. El servidor comprueba propiedad, estado, visibilidad, rango y cupo; fija ambos participantes y sus datos de combate antes de simular. No hay selección automática de otro rival en caso de rechazo o indisponibilidad.
- Un luchador privado puede iniciar desafíos por medio de su dueño autenticado contra rivales públicos y elegibles. No aparece en búsquedas, perfiles ni clasificaciones públicas; un combate en que participe solo es visible para sus participantes autorizados. Un luchador privado no puede ser elegido como rival.
- Un desafío PvP competitivo solo se acepta cuando la diferencia de ELO entre ambos está dentro de **±200 puntos**, rango inicial ya sugerido por el MVP. Fuera del rango, el servidor rechaza la solicitud con un error visible, no consume cupo y no la convierte en entrenamiento. No se amplía el rango automáticamente.
- Un luchador privado, suspendido o perteneciente a una cuenta suspendida no puede ser rival. Si el estado cambia entre la consulta y la aceptación, el servidor vuelve a validarlo y rechaza antes de consumir cupo.
- Un mismo par de luchadores puede completar como máximo un desafío PvP recompensado por día UTC; los pares inversos representan la misma pareja. Repetir el mismo `requestId` con el mismo luchador y los mismos datos de desafío devuelve el resultado persistido sin consumir otro cupo ni aplicar recompensas. Reutilizar esa clave con otro rival o datos distintos se rechaza como conflicto. Una nueva petición contra el mismo par ese día también se rechaza sin consumir cupo.
- La cuota aprobada es de **5 desafíos iniciados por luchador y día UTC**. Cada luchador dispone de **6 desafíos en la fecha UTC de su creación**; desde la siguiente fecha UTC dispone de 5. Solo consume cuota el luchador que inicia el desafío; ser elegido como rival no consume la cuota de ese luchador. Los cupos son independientes por luchador, no se comparten entre personajes de una cuenta y no se reinician al cambiar de luchador activo. Los rechazos previos a iniciar la simulación no consumen cupo; un combate iniciado sí lo consume aunque el jugador pierda o empate.
- Las peleas contra rivales de entrenamiento siguen excluidas de ELO y clasificación. En la expansión no se ofrecen automáticamente como sustituto de un desafío PvP fallido; cualquier acceso voluntario a entrenamiento conservará sus propias reglas y no será competitivo.

#### Catálogo de rivales dirigidos

- El catálogo muestra únicamente `id`, nombre del luchador, nombre de usuario de su dueño, nivel, ELO, apariencia y contadores de victorias, derrotas y empates. No añade XP ni estadísticas base al catálogo. Esta proyección acotada no cambia los campos de los perfiles públicos existentes.
- La búsqueda por texto coincide parcialmente, sin distinguir mayúsculas, con el nombre del luchador; los filtros opcionales de nivel mínimo y máximo solo reducen el conjunto elegible. El orden predeterminado es por menor diferencia absoluta de ELO respecto del luchador activo y, en empate, por ID ascendente. Se pagina con `page` predeterminado en `1` y `limit` predeterminado en `20`, máximo `50`.
- Solo se listan luchadores de otras cuentas, públicos y activos, de cuentas activas, dentro del rango de ±200 ELO, y contra los que el iniciador aún no haya completado un desafío recompensado ese día UTC. La privacidad del luchador iniciador no impide que su dueño autenticado inicie un desafío. El estado `active` no depende de la conexión, el último acceso ni la actividad reciente del dueño; una suspensión vuelve al luchador no elegible.
- Los luchadores privados o suspendidos y las cuentas suspendidas se excluyen sin revelar su existencia. La lista de rivales nunca demuestra que un objetivo siga elegible al aceptar: el servidor revalida propiedad, visibilidad, estado, rango, repetición y cupo en cada solicitud.
- Si no hay resultados, el catálogo devuelve una lista vacía y no selecciona ni sustituye al rival. La interfaz puede indicar que se amplíe o quite filtros y que se intente más tarde. Un combate de entrenamiento solo puede iniciarse voluntariamente mediante su flujo diferenciado; no es una opción PvP, no se presenta como el rival seleccionado y no modifica ELO.
- Además de los cupos diarios y del límite por pareja, las solicitudes de desafío se limitan técnicamente por cuenta e IP según la política configurable de protección contra abuso. El umbral técnico se fija tras medir carga y abuso; una solicitud limitada o rechazada antes de iniciar el combate no consume cupo.

| Caso del objetivo | Visible en el catálogo | Resultado al solicitar el desafío |
|---|---|---|
| Luchador público y activo de otra cuenta activa, dentro de ±200 ELO, sin desafío recompensado previo con el iniciador ese día UTC | Sí | El servidor revalida todas las condiciones y acepta si el iniciador también es elegible y tiene cupo. |
| Luchador propio, público o privado | No | Rechazado antes de consumir cupo; no puede desafiarse a sí mismo ni a otra ficha de su cuenta. |
| Luchador privado, luchador suspendido o luchador de una cuenta suspendida | No | Rechazado antes de consumir cupo, sin revelar su existencia; las consultas públicas lo tratan como inexistente. |
| ID inexistente | No | Rechazado antes de consumir cupo con la misma respuesta pública que un objetivo privado. |
| Luchador público y activo fuera del rango de ±200 ELO | No | Rechazado antes de consumir cupo con un error de rango; no se amplía el rango ni se inicia entrenamiento. |
| Pareja que ya completó un desafío recompensado ese día UTC | No | Rechazado antes de consumir cupo, incluso si se invierten los participantes. |

#### Atributos, aleatoriedad y progresión

- Las cuatro estadísticas base del luchador son vida, ataque, defensa y velocidad. Al crear un luchador, el servidor elige con probabilidad uniforme uno de estos perfiles iniciales:
  - **Resistente:** vida 85, ataque 10, defensa 5, velocidad 5.
  - **Equilibrado:** vida 100, ataque 10, defensa 4, velocidad 5.
  - **Vitalidad:** vida 115, ataque 10, defensa 3, velocidad 5.
  Ningún cliente puede elegir ni alterar el perfil. El análisis reproducible con el motor de combate `1.0.0`, 5.000 semillas determinísticas distintas por enfrentamiento y posiciones alternadas dio entre 50,2 % y 50,3 % de victorias equivalentes entre cada pareja de perfiles en los niveles 1, 3, 4 y 10. Las semillas de prueba siguen el patrón `10.3.1-independent-${level}-${index}`. El resultado describe el motor actual; debe repetirse si cambia su versión o las reglas de combate.
- La persona elige la apariencia en catálogos cerrados, originales y puramente cosméticos. La paleta de tono ofrece `arena`, `arcilla`, `cobre`, `pizarra` y `marfil`; el cabello, `rapado`, `corto`, `trenzas`, `melena` y `cresta`; la vestimenta, `tunica-cruzada`, `manto-corto`, `faldon-tejido` y `chaleco-tejido`; los accesorios, `ninguno`, `cinta`, `collar-cuentas`, `brazaletes` y `pendientes`. Las cuatro elecciones se combinan libremente: hay 500 combinaciones válidas, cada una representable con recursos visuales originales. Ninguna opción estética modifica estadísticas, equipo ni reglas de combate. Para luchadores legados sin apariencia se usará la combinación neutral `arena`, `rapado`, `tunica-cruzada`, `ninguno`.
- El equipo inicial no incluye armadura: el único objeto inicial es el arma aleatoria indicada abajo, que se entrega y equipa en el espacio de arma al crear el luchador. No se asignan habilidades ni mascotas al crear. La armadura no forma parte de la primera tabla de desbloqueos de la expansión y queda pendiente para una tarea de diseño posterior.
- La creación usa una semilla de 32 bytes generada exclusivamente en el servidor con `node:crypto.randomBytes`; no se aceptan semillas ni elecciones de atributos del cliente. La versión `fighter-creation-v1` deriva cada sorteo del bloque `SHA-256(seed || UTF-8(etiquetaDeDominio) || uint32BE(contador))`, empezando el contador en cero y aumentándolo si hay que rechazar un bloque. El digest se interpreta como entero sin signo big-endian de 256 bits. Para elegir uniformemente entre `N` opciones, se acepta solo un valor menor que `floor(2^256 / N) * N` y se usa su resto módulo `N`; los valores fuera de ese límite se descartan para evitar sesgo. Los dominios de perfil y arma inicial son distintos. El luchador conserva la semilla, versión y resultado para auditar o reproducir la creación. Los sorteos de progreso y desbloqueo también registran semilla, versión y resultado; sus entradas se separan por dominio. Los combates conservan sus snapshots y semilla de simulación. Una misma semilla, entrada y versión produce la misma salida.
- En la progresión de la expansión, las estadísticas se interpretan así: vida (`health`, vitalidad), ataque (`attack`, fuerza), defensa (`defense`, agilidad) y velocidad (`speed`, velocidad). Cada nivel ganado resuelve exactamente una mejora independiente de las tiradas de desbloqueo: el servidor aumenta en **1 punto** una estadística elegible y el jugador no elige el resultado.
- Los pesos iniciales del sorteo son vida **35**, ataque **30**, defensa **20** y velocidad **15** (100 en total). Son pesos relativos: si una estadística alcanza su tope, deja de ser elegible y los pesos restantes se normalizan entre las estadísticas que aún pueden crecer. Un sorteo usa distribución entera ponderada sin sesgo y una entrada aleatoria reproducible/versionada del servidor; el cliente no proporciona semilla, estadística ni magnitud.
- La implementación `fighter-growth-v1` genera en el servidor una semilla independiente de 32 bytes por nivel ganado. Para el nivel destino deriva un entero con `SHA-256(seed || UTF-8("fighter-growth-v1:<nivel>") || uint32BE(contador))` y aplica rechazo uniforme antes de mapearlo a los pesos de las estadísticas elegibles. Cada evento persistido conserva el nivel, semilla, versión, atributo y magnitud (cero si todos los topes ya se alcanzaron) y la clave de la recompensa que lo produjo. Los nuevos luchadores inicializan el estado de progresión al crearse; al progresar por primera vez, los legados guardan como base efectiva sus estadísticas actuales calculadas con la regla fija anterior y mantienen intactos sus `baseStats`.
- Cada estadística puede crecer, respecto a sus `baseStats` iniciales, hasta estos incrementos máximos: vida **+50**, ataque **+20**, defensa **+15** y velocidad **+10**. El tope efectivo es el valor base del luchador más el incremento máximo correspondiente. En luchadores legados, el crecimiento fijo del MVP ya obtenido cuenta para estos límites; si un valor efectivo existente ya supera su tope, se conserva y deja de ser elegible para nuevos aumentos. No se sortean mejoras retroactivas. Al activar la regla, se conservan el nivel, los `baseStats` y las estadísticas efectivas actuales de cada luchador; cada nivel posterior usa esta regla aleatoria.
- En luchadores nuevos, el aumento sorteado se aplica a la estadística base y no se suma además el antiguo bono fijo por nivel. Para luchadores legados, el bono fijo ya obtenido se conserva exactamente una vez como parte de su estado efectivo; los aumentos aleatorios futuros se aplican sin volver a calcular ese bono ni modificar sus `baseStats` originales. Las estadísticas efectivas se calculan en el servidor desde sus valores base, el crecimiento aleatorio y el equipo, sin duplicar bonos derivados del nivel.
- No hay nivel máximo. Al procesar una recompensa, se consume en orden el umbral de cada nivel y se conserva todo el XP restante. Se resuelve una mejora por cada nivel cruzado, incluso cuando una recompensa gana varios niveles. Si una estadística ya llegó a su tope se excluye del sorteo; si todas llegaron, el nivel y el XP siguen avanzando sin aumento de estadísticas. Llegar a un tope nunca descarta XP ni impide procesar otros niveles o desbloqueos.
- Ejemplos con el umbral de XP vigente: nivel 1 con 90 XP que recibe 25 XP termina en nivel 2 con 15 XP restantes y una mejora; nivel 1 con 0 XP que recibe 600 XP termina en nivel 5 con 50 XP restantes y procesa cuatro mejoras, una por cada nivel ganado. En el segundo caso no se garantiza que las cuatro mejoras recaigan en estadísticas distintas: cada sorteo vuelve a considerar los pesos y topes vigentes.
- Comparación con el crecimiento fijo del MVP entre niveles 1 y 5: el MVP añade +20 vida, +2 ataque y +1 defensa; la expansión distribuye cuatro aumentos de +1 según sus pesos y topes, con un máximo total de cuatro puntos en ese tramo. Para un perfil equilibrado inicial (100 vida, 10 ataque, 4 defensa, 5 velocidad), los topes absolutos son 150, 30, 19 y 15, respectivamente. Para cualquier perfil, se calculan sumando sus topes relativos a sus valores base iniciales.
- La creación concede exactamente un arma inicial aleatoria de la selección básica. No concede habilidades ni mascotas. En cada nivel ganado se realiza una tirada independiente de desbloqueo que puede no otorgar nada o conceder un arma, habilidad o mascota permitida para ese nivel. Las probabilidades, rarezas, catálogo y niveles mínimos son pendientes de balance y configuración, no se inventan en esta especificación.
- El perfil y el arma inicial se sortean una sola vez al crear el luchador; no se permiten repeticiones ni cambios del resultado después de la creación. Cada desbloqueo se sortea una sola vez por evento de subida de nivel. Un reintento idempotente no repite tiradas ni recompensas. El catálogo no ofrece duplicados: si no queda una recompensa elegible que el luchador no posea, la tirada no concede objeto y no genera una compensación automática.
- Las reglas de slot, compatibilidad, efectos, límites de equipo y disponibilidad por nivel deben ser explícitas y validadas por el servidor. Una habilidad o mascota no se activa solo por poseerla; sus reglas de uso y efectos se documentan y balancean antes de implementarlas.
- Las recompensas existentes de XP y ELO del MVP se mantienen salvo que una tarea de balance posterior las cambie explícitamente. Ningún desbloqueo aleatorio se acepta como entrada del cliente ni depende del resultado visual del frontend.

#### Dojos, invitaciones y límites de abuso

- La relación de invitación actual sigue perteneciendo a la cuenta y permanece única e inmutable. No se transforma silenciosamente en una relación de dojo ni se multiplica por cada luchador de esa cuenta.
- El dojo es una relación distinta entre luchadores: un luchador puede tener como máximo un maestro y un maestro puede tener varios aprendices. No se admiten autorreferencias, relaciones entre luchadores del mismo dueño, ciclos ni cambios de maestro para volver a cobrar recompensas. La relación y su fecha de alta deben poder auditarse.
- Las recompensas del dojo no aumentan ELO, estadísticas de combate ni cupos. La recompensa aprobada para la primera versión del sistema es cosmética/social; catálogo, hitos y cantidades quedan pendientes de diseño en el paso específico del dojo. No hay recompensa retroactiva por crear varias cuentas o luchadores.
- El servidor impone unicidad e idempotencia en creación, desafíos, progresión, desbloqueos y premios de dojo. Cada evento de recompensa tiene un origen único y no puede liquidarse dos veces, ni mediante peticiones concurrentes ni al repetir una solicitud.
- Los controles contra automatización incluyen límites por cuenta e IP, validación y autorización en servidor, no aceptar propiedad/estadísticas/recompensas desde el cliente, restricciones a desafíos repetidos, exclusión de luchadores privados como rivales y de luchadores o cuentas suspendidos de cualquier participación, registro de decisiones y moderación. La privacidad no oculta la aplicación de estas reglas al servidor.

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
- `activeFighterId` opcional y nullable: selección del luchador activo propio. En documentos legados sin este campo, una única relación User–Fighter se considera seleccionada; una cuenta sin luchador no tiene selección. Si una cuenta tiene varios luchadores y el campo falta o apunta a una ficha ajena/inexistente, las operaciones que la necesiten piden que seleccione uno, nunca escogen otro arbitrariamente.
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

Representa a un personaje jugable. A diferencia del esquema del MVP, una cuenta puede ser dueña de varios luchadores.

- `_id`
- `userId` del dueño; no es único
- `name` normalizado y único
- `level`, `xp`, `elo`
- `baseStats`: vida, ataque, defensa y velocidad
- `status`: `active` o `suspended`
- `visibility`: `public` o `private`
- semilla y versión de las reglas de creación aleatoria
- inventario de armas, habilidades y mascotas obtenidas
- contadores de victorias, derrotas y empates
- `referralCode` único
- `createdAt`, `updatedAt`

Cada cuenta selecciona un luchador activo; esa selección no concede propiedad adicional ni altera el estado de los demás. Evitar guardar estadísticas derivadas duplicadas salvo que exista una necesidad de rendimiento demostrada. Si se almacenan, documentar cómo se recalculan y prueban.

Compatibilidad para la expansión:

- `userId` sigue siendo obligatorio y referencia al dueño; deja de ser único. Los documentos existentes conservan exactamente su dueño.
- `status` y `visibility` son opcionales para documentos previos: la ausencia significa `active` y `public`, respectivamente. Las lecturas deben aplicar esos valores compatibles sin requerir una reescritura masiva.
- La semilla y versión de creación son opcionales para luchadores del MVP. Si faltan, el luchador conserva sus estadísticas actuales como valores legados; no se vuelve a sortear ni se fabrican semillas retroactivas. Las creaciones de la expansión guardan resultado, semilla y versión.
- `activeFighterId` vive en `User`, no duplica la propiedad en Fighter. Toda selección se valida contra `Fighter.userId` en servidor.

### 6.3 Battle

Registro inmutable del resultado.

- `_id`
- `battleType`: `pvp` o `training`
- `status`: `completed` (los errores anteriores a finalizar no deben quedar como victorias)
- instantáneas de ambos luchadores: id, nombre, nivel, ELO y estadísticas usadas
- semillas y versiones de reglas para los sorteos de progreso y desbloqueo que produzca la pelea
- `winnerFighterId` opcional; empate si no hay ganador
- `seed` del motor y `engineVersion`
- `snapshotVersion` opcional para distinguir el formato de snapshot; su ausencia identifica el formato legado vigente al crear el registro
- `events` ordenados
- resultado de XP y ELO de ambos
- `createdAt`
- `requesterFighterId` y `requestId` para identificar de forma idempotente la petición de un participante. La clave queda ligada al mismo luchador iniciador y al mismo rival/datos del desafío; reutilizarla con datos distintos se rechaza en vez de devolver un resultado ajeno a la petición.

La combinación `requesterFighterId + requestId` debe ser única; en la expansión `requesterFighterId` identifica al luchador iniciador. La clave se liga además al rival y a los datos de la petición: un reintento idéntico devuelve el resultado persistido, y reutilizarla con otro contenido se rechaza como conflicto. La creación de la pelea y la actualización de ambos luchadores se confirman en una única transacción; si falla cualquiera de las escrituras, no se conserva la pelea ni se aplican recompensas.

El historial no debe depender de consultar el estado actual de un luchador para explicar una pelea anterior. Los snapshots y eventos existentes se conservan byte por byte durante la transición; un replay usa su `engineVersion`, y los nuevos snapshots incluyen `snapshotVersion`. Nunca se reconstruye una pelea antigua con estadísticas o datos de perfil actuales.

### 6.4 DailyActivity

Control de los desafíos iniciados por luchador, no por cuenta. Ser elegido como rival no consume su cuota. Durante la transición, `userId` es un campo legado opcional para leer registros MVP; los registros nuevos de la expansión usan `fighterId`.

- `_id`
- `fighterId`
- `userId` legado opcional, conservado solo mientras se completa la transición de registros antiguos
- `dateKey` como fecha UTC en formato estable `YYYY-MM-DD`
- `limit` efectivo del día (6 en la fecha UTC de creación del luchador; 5 después)
- `battlesUsed`
- `requestIds` reservados ese día para no consumir más de un intento al repetir la misma solicitud
- identificadores de las peleas aceptadas, cuando sea útil para idempotencia
- `createdAt`, `updatedAt`

Índice único compuesto por `fighterId + dateKey` para los registros nuevos. El índice legado `userId + dateKey` se mantiene solo durante la conversión y se elimina después de verificarla. Las actualizaciones para reservar un intento deben ser atómicas y verificar que aún hay disponibilidad. Una cuenta con varios luchadores tiene cupos independientes; cambiar de luchador activo no crea ni renueva cupos.

### 6.5 Relaciones de invitación

En el MVP puede representarse con `User.referredByUserId` y los códigos de invitación de `Fighter`. Si más adelante se requieren estadísticas, recompensas, prevención de abuso o auditoría, migrar a una colección `Referral` documentada sin alterar silenciosamente el historial.

### 6.6 Índices previstos

- User: `username` único, `email` único.
- Fighter: índice no único por `userId` (la versión actual lo declara único y debe cambiarse), compuesto no único por `userId + createdAt + _id` para listar fichas propias, `name` único, `referralCode` único, índice por ELO descendente y compuesto por `visibility + status + elo + _id` para candidatos públicos. La elegibilidad de la cuenta dueña se comprueba al consultar; no se confía en el índice como autorización.
- Battle: fecha descendente, participantes + fecha, e idempotencia única cuando aplique.
- DailyActivity: `fighterId + dateKey` único parcial para documentos con `fighterId` de tipo ObjectId; el índice legado `userId + dateKey` solo hasta completar la transición.

Crear cada índice en el paso de desarrollo de su modelo. No generar modelos, índices o colecciones no necesarios para el paso activo.

### 6.7 Compatibilidad y transición de datos para múltiples luchadores

La relación final es uno a varios: `Fighter.userId` identifica al dueño y no es único; `User.activeFighterId` identifica, cuando existe, el único luchador seleccionado para iniciar desafíos y mostrar el panel. No se copia `userId` a nuevas entidades como autoridad alternativa. Los registros actuales de `Fighter`, `Battle`, `User` e invitaciones se conservan; cambiar el índice de propiedad no cambia ni reasigna dueños.

Los campos nuevos se introducen de forma compatible y opcional para documentos existentes: `User.activeFighterId` puede faltar o ser `null`; ausencia de `Fighter.status` significa `active`, ausencia de `visibility` significa `public`; la ausencia de semilla/versión de creación identifica datos MVP que no se regeneran; la ausencia de `Battle.snapshotVersion` identifica snapshots legados que se leen con su forma original. Los DTO públicos pueden incluir la selección y privacidad solo conforme a las reglas de autorización de la sección 9.4. Ningún valor faltante autoriza a inferir propiedad de un ID enviado por el cliente.

#### Plan de transición y recuperación

No se requiere reescribir luchadores, cuentas ni batallas para admitir la relación uno-a-varios. Sí se requiere una migración versionada y repetible de índices, selección y actividad diaria antes de habilitar más de un luchador por cuenta:

1. **Precondiciones y respaldo:** realizar y verificar un respaldo recuperable de la base antes del cambio; registrar versión de aplicación e índices. Detener y abortar si hay luchadores huérfanos, más de un luchador por dueño antes de la expansión, nombres/códigos duplicados tras la normalización vigente, `activeFighterId` que no pertenezca a la cuenta, actividades diarias sin dueño/luchador correspondiente o referencias de batalla a participantes inexistentes. Resolver conflictos con revisión explícita; no renombrar, reasignar propiedad ni descartar registros automáticamente.
2. **Lectura compatible:** desplegar primero código que interprete los campos ausentes con los valores legados descritos arriba. Para una cuenta existente con exactamente un luchador, si no hay `activeFighterId`, ese luchador es el activo efectivo. Al seleccionar o crear mediante el flujo nuevo se persiste el ID. Las cuentas sin luchador siguen sin selección.
3. **Índices y cupos:** con escrituras de creación pausadas, sustituir el índice único actual de `Fighter.userId` por el índice no único equivalente; verificar el nuevo índice antes de reanudar escrituras. Añadir el índice único parcial de `DailyActivity.fighterId + dateKey` solo para documentos cuyo `fighterId` sea ObjectId, para que los registros legados sin ese campo no colisionen entre sí. Convertir cada actividad legada `userId + dateKey` al único luchador de ese dueño, copiando `dateKey`, `limit` si existe, usos, `requestIds` y referencias de batalla sin alterarlos. La operación usa una clave/versionado de migración, compara un destino ya existente antes de reintentar y solo elimina el registro legado después de verificar igualdad. Si no hay correspondencia única o hay conflicto, aborta y deja ambos registros intactos. Una vez verificada la conversión completa, retirar el índice único antiguo de `DailyActivity.userId + dateKey`; comprobar primero las definiciones reales por claves/opciones, no asumir sus nombres físicos.
4. **Verificación posterior:** comprobar conteos de usuarios y luchadores, igualdad de propietarios, selección válida o ausencia de selección, unicidad de nombres y códigos, conservación de campos de progreso/invitación, igualdad de actividades convertidas y lectura de batallas antiguas con snapshots/eventos sin modificación. Ejecutar la migración en una copia restaurada de producción y pruebas de integración antes de habilitar creación múltiple.
5. **Rollback/recuperación:** antes de crear un segundo luchador para cualquier cuenta, se puede volver a la aplicación anterior solo si todas las fichas siguen públicas y activas, no hay datos de expansión que la versión anterior no pueda leer y se restaura el índice único de `Fighter.userId` y el índice legado de actividad; la conversión de actividades se revierte comparando los datos antes de retirar el destino nuevo. Si ya se usó privacidad/suspensión u otra capacidad no entendida por la versión anterior, se vuelve a la última versión compatible que respete esos campos, no al MVP original. Tras crear más de un luchador para una cuenta, la aplicación MVP y el índice único no son un rollback compatible: pausar escrituras, preservar respaldo y reparar hacia delante; restaurar el respaldo anterior solo con autorización y aceptando explícitamente la pérdida de escrituras posteriores. No borrar ni fusionar luchadores para hacer encajar la versión antigua.

La migración se ejecuta una sola vez por versión, con escrituras de arena/creación pausadas durante la conversión o con una ventana equivalente que impida reservas concurrentes; nunca se aplica automáticamente al arrancar cada instancia ni directamente en producción sin el paso y autorización de despliegue correspondientes.

---

## 7. API REST prevista

Estas rutas son el contrato objetivo, no una orden de implementarlas todas de inmediato. Cada grupo se desarrolla únicamente cuando lo indique `ROADMAP.md` y `CURRENT_STEP.md`.

| Método | Ruta | Requiere sesión | Propósito |
|---|---|---:|---|
| `GET` | `/api/v1/health` | No | Verificar que el servidor responde |
| `POST` | `/api/v1/auth/register` | No | Crear cuenta, aceptar invitación opcional y abrir sesión automáticamente |
| `POST` | `/api/v1/auth/login` | No | Iniciar sesión |
| `POST` | `/api/v1/auth/logout` | Sí | Destruir la sesión |
| `GET` | `/api/v1/auth/me` | Sí | Consultar cuenta autenticada |
| `POST` | `/api/v1/fighters` | Sí | Crear un luchador para la cuenta |
| `GET` | `/api/v1/fighters/me` | Sí | Obtener el luchador activo propio |
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

En la expansión, las rutas `/api/v1` conservan el contrato MVP para cuentas con cero o un luchador. No elegirán silenciosamente un luchador si hay más de uno: las operaciones singulares responden `409 MULTIPLE_FIGHTERS_REQUIRE_V2`. Los perfiles privados se ocultan en rutas públicas como si no existieran. Las operaciones para gestionar varias fichas se definen en el contrato `/api/v2` siguiente.

`GET /api/v1/fighters/:id` y `GET /api/v1/profiles/:username` solo revelan perfiles públicos; para un luchador privado responden como si no existiera. Un propietario autenticado conserva acceso a sus luchadores privados por las operaciones propias, nunca por un permiso inferido del identificador enviado por el cliente.

En la expansión, `GET /api/v1/profiles/:username` de v1 conserva la respuesta singular solo cuando la cuenta posee cero o un luchador; si posee varios, responde `409 MULTIPLE_FIGHTERS_REQUIRE_V2`, aunque solo uno sea público, en vez de elegirlo arbitrariamente. La ruta v2 devuelve la colección pública. Las consultas de batalla públicas solo muestran combates cuyos dos luchadores continúan públicos. El historial propio y el de los participantes autorizados sigue disponible conforme a la regla de privacidad, incluso si luego un luchador se vuelve privado.

El contrato MVP de `POST /api/v1/arena/fight` recibe solo `{ requestId }` y deja que el servidor seleccione rival. En `/api/v2`, los desafíos identifican al luchador propio seleccionado, al rival elegido y la clave de idempotencia; no reutilizan la selección automática. La reserva diaria se consulta para el luchador iniciador y devuelve `{ dateKey, limit, used, remaining }`, con el día UTC y límite 6 en la fecha de creación o 5 en fechas posteriores. Repetir la misma clave con el mismo iniciador y rival devuelve el combate persistido sin consumir otro intento ni aplicar recompensas nuevamente; reutilizarla con otra petición se rechaza. Una nueva solicitud contra el mismo par ese día se rechaza sin consumir cuota. `GET /api/v1/arena/history` acepta `page` (por defecto `1`) y `limit` (por defecto `20`, máximo `50`), y devuelve `{ battles, pagination: { page, limit, totalItems, totalPages } } ordenado por fecha descendente.

El detalle autorizado de `GET /api/v1/battles/:id` incluye, por participante, `result.progression` con nivel y XP antes/después, niveles ganados, estadísticas efectivas antes/después y los aumentos `{ level, stat, amount }` guardados para esa recompensa. Los valores anterior y posterior se guardan en el resultado del combate y se calculan en el servidor; el cliente no los deriva. La respuesta no expone semillas ni claves de idempotencia. Los combates históricos creados antes de guardar estos datos pueden omitir `progression`.

#### Contrato de API de la expansión

Las rutas `/api/v2` soportan varias fichas sin cambiar silenciosamente el significado de las respuestas singulares existentes:

| Método | Ruta | Sesión | Contrato de expansión |
|---|---|---:|---|
| `GET` | `/api/v2/fighters` | Sí | Lista paginada de todos los luchadores propios, incluidos privados y suspendidos, con su estado y visibilidad. |
| `POST` | `/api/v2/fighters` | Sí | Recibe únicamente `{ name, requestId }`; crea un luchador propio con valores iniciales definidos por el servidor y lo selecciona. El mismo `requestId` y nombre normalizado devuelve el luchador existente; reutilizar la clave con otro nombre responde `409 IDEMPOTENCY_KEY_REUSED`. |
| `GET` | `/api/v2/fighters/active` | Sí | Devuelve la ficha seleccionada del dueño o `null` si no tiene selección. |
| `PUT` | `/api/v2/fighters/active` | Sí | Recibe `{ fighterId }`; solo selecciona una ficha propia no suspendida. La propiedad se verifica en servidor. |
| `GET` | `/api/v2/fighters/:id` | No | Devuelve una ficha solo si es pública, elegible y su cuenta está activa; en otro caso responde como inexistente. |
| `GET` | `/api/v2/profiles/:username` | No | Devuelve `{ username, fighters }` con todas las fichas públicas y elegibles de la cuenta; una cuenta sin fichas públicas responde sin revelar las privadas. |
| `GET` | `/api/v2/arena/opponents` | Sí | Lista fichas públicas/elegibles de otras cuentas dentro de ±200 ELO de la ficha activa. No incluye luchadores privados, suspendidos, cuentas suspendidas, personajes propios ni parejas que ya completaron un desafío recompensado ese día UTC. Es paginada y permite búsqueda parcial por nombre y filtros de nivel mínimo/máximo. |
| `GET` | `/api/v2/arena/attempts` | Sí | Devuelve `{ fighterId, dateKey, limit, used, remaining }` para la ficha activa seleccionada. |
| `POST` | `/api/v2/arena/challenges` | Sí | Recibe `{ fighterId, opponentFighterId, requestId }`; el `fighterId` debe pertenecer a la cuenta y ser su ficha activa al aceptar un desafío nuevo. |
| `GET` | `/api/v2/arena/history` | Sí | Lista, con paginación, combates de cualquiera de las fichas propias; cada combate incluye `ownFighterId` para identificar la ficha propia que participó. La autorización se basa en la propiedad actual de las fichas participantes. |

La creación valida el nombre (3–18 caracteres) y limita solicitudes temporalmente por cuenta e IP mediante `FIGHTER_CREATION_ACCOUNT_LIMIT` (por defecto 5), `FIGHTER_CREATION_IP_LIMIT` (por defecto 30) y `FIGHTER_CREATION_WINDOW_MS` (por defecto una hora). Son límites técnicos configurables, no un máximo permanente de luchadores por cuenta. La API v2 no permite al cliente establecer estados ni visibilidad: los luchadores nuevos empiezan activos y públicos; solo se puede seleccionar un luchador propio no suspendido. En este alcance no se permite archivar, eliminar ni renombrar luchadores; sus nombres permanecen inmutables y se conserva su identidad para el historial.

`GET /api/v2/arena/opponents` devuelve `{ fighters, pagination: { page, limit, totalItems, totalPages } }`, con `page` predeterminado en `1`, `limit` predeterminado en `20` y máximo `50`. Acepta `q` para buscar por coincidencia parcial, sin distinguir mayúsculas, en el nombre del luchador, y `minLevel`/`maxLevel` para acotar el nivel. Los resultados se ordenan por diferencia absoluta de ELO ascendente y luego por ID ascendente. Cada elemento contiene únicamente `id`, `name`, `username`, `level`, `elo`, `appearance`, `wins`, `losses` y `draws`; no incluye XP ni estadísticas base. Si no hay resultados, devuelve la página vacía, sin revelar perfiles excluidos ni reemplazar el objetivo.

En `POST /api/v2/arena/challenges`, antes de reservar cuota el servidor verifica sesión y estado de la cuenta, propiedad del iniciador, selección activa, elegibilidad de ambas cuentas y fichas, visibilidad pública del rival, diferencia de ELO, pareja no repetida ese día y disponibilidad del cupo. Revalida privacidad, suspensión y rango al aceptar; rechaza sin consumir cupo cuando una condición no se cumple. El luchador privado propio sí puede iniciar, pero la ficha rival debe ser pública. La clave `requestId` queda ligada a `fighterId`, `opponentFighterId` y al contenido validado: un reintento idéntico recupera el mismo combate aunque la selección activa cambie después; para recuperarlo se vuelve a comprobar que el iniciador pertenece a la cuenta autenticada. La misma clave con contenido distinto responde `409 IDEMPOTENCY_KEY_REUSED`. El límite diario y la recompensa solo se aplican al iniciador.

La interfaz y API de la expansión se despliegan juntas antes de permitir la creación de varias fichas. El despliegue habilita primero lectura/escritura compatibles y v2, mantiene desactivada la creación múltiple mientras se completa y verifica la transición, y solo después habilita la función. Durante la transición, las rutas v1 siguen atendiendo cuentas sin luchador o con exactamente uno. Cuando una cuenta tiene varios, cualquier endpoint v1 que suponga una ficha única responde `409 MULTIPLE_FIGHTERS_REQUIRE_V2`; nunca elige por orden de consulta ni revela una ficha privada. Los clientes nuevos usan v2. Los endpoints públicos v1 por ID también deben aplicar privacidad y estado elegible, y no pueden eludir las comprobaciones de v2.

Los identificadores enviados por el cliente nunca demuestran propiedad. Toda operación autenticada que lea, seleccione o modifique un luchador filtra por `userId = cuenta de la sesión`; si el ID existe pero no pertenece a esa cuenta, se responde como inexistente. En rutas públicas se consulta exclusivamente por ID/nombre y visibilidad/estado permitidos. `GET /api/v2/profiles/:username` responde `404` tanto si la cuenta no existe como si no tiene fichas públicas elegibles, sin revelar la existencia de fichas privadas.

#### Escenarios de compatibilidad que deben verificarse

- **Cuenta previa sin luchador:** permanece sin selección; al crear la primera ficha, queda seleccionada. No se crea una cuenta nueva ni se altera la invitación.
- **Cuenta previa con un luchador:** conserva ID, dueño, nombre, nivel, XP, ELO, estadísticas, código de invitación e historial. Si `activeFighterId` falta, la ficha existente es la selección efectiva y no requiere backfill.
- **Cuenta con varias fichas:** la lista propia incluye todas; la selección válida se respeta. Si falta o es inválida, la API no deduce una selección por orden y requiere una acción explícita del dueño.
- **Conflicto de nombres o códigos:** el preflight detecta duplicados bajo la normalización existente y detiene la migración para resolución explícita; no renombra fichas ni cambia códigos automáticamente.
- **Ficha privada:** el dueño autenticado puede leerla/seleccionarla de acuerdo con su estado; los endpoints públicos, búsquedas, clasificaciones y desafíos como rival responden como si no existiera. El dueño puede iniciar desafíos con ella conforme a 4.8.
- **Replay antiguo:** los participantes, snapshots, eventos, semilla y `engineVersion` almacenados se leen sin reescritura y no dependen de campos actuales del luchador.

`GET /api/v1/leaderboards` es público; acepta `category` (`elo` por defecto o `level`), `page` (por defecto `1`) y `limit` (por defecto `20`, máximo `50`). Devuelve `{ fighters, pagination: { page, limit, totalItems, totalPages } }`. El servidor ordena la categoría elegida de mayor a menor y resuelve los empates por ID de luchador de menor a mayor. Cada luchador incluye únicamente los campos del perfil público y el nombre de usuario.

El registro acepta `username`, `email` y `password`, y opcionalmente `referralCode`. El código debe corresponder a un luchador existente; la nueva cuenta queda vinculada de forma permanente al usuario dueño de ese luchador. Un código desconocido se rechaza con HTTP 400. Un registro correcto crea una sesión de servidor, regenera el identificador de sesión y devuelve HTTP 201 con `id`, `username` y `email` públicos y la cookie de sesión; nunca devuelve credenciales ni hashes. Los conflictos de nombre o correo devuelven el mismo error HTTP 409 para no distinguir cuál valor está ocupado.

El inicio de sesión acepta únicamente `identifier` y `password`; `identifier` puede ser el nombre de usuario o el correo electrónico registrado.

---

## 8. Frontend y navegación

### 8.1 Rutas de interfaz previstas

- `/` — página inicial pública.
- `/register` — registro.
- `/login` — inicio de sesión.
- `/create-fighter` — creación del primer personaje en el MVP; en la expansión, creación de otro luchador desde la cuenta autenticada.
- `/dashboard` — resumen del luchador activo propio y accesos principales.
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
- La página de inicio conserva una presentación pública para visitantes y ofrece una continuación al panel para sesiones activas. El logo vuelve a ese inicio, que no destruye la sesión.
- Después del registro, la sesión autenticada continúa al flujo de creación del luchador.
- El resultado presenta una animación visual sencilla construida con los eventos persistidos; el registro textual permanece disponible y `prefers-reduced-motion` desactiva el movimiento.

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
- Limitar creación de luchadores y desafíos por cuenta e IP, con umbrales técnicos configurables; impedir que usar varias identidades de luchador de una cuenta evada límites que correspondan a la cuenta.
- Verificar en cada desafío que el rival es público, elegible y está dentro del rango; aplicar el límite diario del par de luchadores antes de aceptar otra pelea recompensada.
- No permitir que un usuario cambie sus propias recompensas, ELO, rol o relación de invitación mediante una petición manipulada.

### 9.3 Combates sin trampas

- Simulación y cálculo de recompensas solo en servidor.
- Semilla generada por el servidor y registro de `engineVersion`.
- Instantáneas de participantes.
- Idempotencia para evitar duplicar recompensas al repetir una petición.
- Cada recompensa, subida de nivel y desbloqueo se identifica por su evento de origen; peticiones repetidas o concurrentes no vuelven a procesar el mismo evento.
- Operaciones de actualización relacionadas ejecutadas de forma coherente. Si se necesita transacción MongoDB, comprobar primero los requisitos del entorno; no fingir atomicidad.
- Los bots no alteran ELO.
- Registrar errores operativos sin exponer secretos ni datos innecesarios.

### 9.4 Privacidad

- Los luchadores son públicos por defecto; el dueño puede marcarlos privados. La privacidad excluye al luchador de búsquedas, páginas públicas, clasificaciones y como rival de desafíos posteriores, pero no impide que su dueño autenticado lo use para iniciar un desafío contra un luchador público. Si participa un luchador privado, el combate solo es visible para los participantes autorizados y no aparece en consultas públicas.
- Las operaciones de lectura privadas exigen una sesión autenticada y una comprobación de propiedad en el servidor. No existe una contraseña de personaje aparte de la contraseña de cuenta.
- Un luchador que pasa a privado no se elimina. Se conservan los snapshots y el historial; las consultas públicas posteriores no exponen la ficha privada, mientras el dueño y los participantes autorizados mantienen acceso a su historial.
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
- En el MVP, un usuario no puede crear un segundo luchador; las pruebas de expansión deben verificar creación de varios sin perder la autorización por propietario.
- Límite diario y peticiones simultáneas.
- No se puede modificar la identidad del luchador objetivo ni enviar recompensas desde el cliente.
- Perfiles inexistentes y paginación inválida.

### 11.3 Pruebas de interfaz

- Formularios con datos válidos e inválidos.
- Sesión persistente al recargar y limpieza al cerrar sesión.
- Estados de carga y error visibles.
- Adaptación a ancho móvil.
- En el MVP, un usuario sin luchador es enviado al flujo de creación y uno que ya lo tiene no puede repetirlo; la expansión permite crear y seleccionar varios luchadores propios.

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
- El MVP vigente tiene un luchador por cuenta y tres intentos diarios por cuenta según UTC; la expansión permite tantos luchadores como necesite cada cuenta y asigna cinco desafíos iniciados diarios por luchador, o seis en su fecha UTC de creación.
- En la expansión, los luchadores son públicos por defecto, se puede seleccionar uno propio como activo y los desafíos PvP se dirigen a un rival público elegido por el jugador dentro de ±200 ELO.
- Experiencia, nivel y ELO calculados por el servidor.
- Rival de entrenamiento de respaldo en el MVP cuando no haya jugadores; no puntúa ELO. La expansión no lo selecciona automáticamente como reemplazo de un rival elegido que no esté disponible.
- Registro de usuarios y perfiles públicos.
- Invitaciones/alumnos con relación persistente, sin bonus competitivo en el MVP.
- La semilla y versión del generador permiten reproducir creación, progresión y combate aleatorios.
- Las recompensas de dojo no dan ventaja competitiva; su catálogo, hitos y cantidades aún están pendientes.
- Las decisiones aún no implementadas no autorizan a Copilot a anticipar trabajo.

### Valores de balance pendientes

- Probabilidades, rarezas y niveles mínimos de armas, habilidades y mascotas; catálogo y efectos concretos.
- Límites técnicos de frecuencia de creación y umbrales de detección de automatización.
- Catálogo, hitos y cantidades de las recompensas cosméticas/sociales del dojo.

### Revisiones futuras permitidas

Se puede ajustar balance, estética, nombre, estructura de recompensas y alcance. Todo cambio que afecte arquitectura, modelos, API o reglas debe actualizar este documento y las pruebas relacionadas antes de implementarse.

---

## 14. Regla final del proyecto

**La especificación define lo que se construye; `ROADMAP.md` define el orden; `CURRENT_STEP.md` define la única tarea autorizada ahora; `.github/copilot-instructions.md` define cómo debe trabajar Copilot.** Si hay una contradicción o falta un requisito importante para el paso activo, Copilot debe detenerse y señalarla en vez de improvisar o adelantarse.
