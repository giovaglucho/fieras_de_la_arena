# Fieras de la Arena — Documento de Diseño Técnico

**Versión:** 0.2 · **Estado:** la etapa 11 (sección 4.9) rediseña el juego sobre la mecánica del remake de referencia. Donde la sección 4.9 contradiga las secciones 4.1–4.8, 6 o 7, **prevalece la 4.9**; esas reglas anteriores quedan como historia de las etapas 0–10 hasta que el paso 11.1.1 limpie el código que las implementa. Los valores de balance pendientes no son definitivos.
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
- Combatir contra los rivales asignados por la arena (otros luchadores reales y, si faltan, luchadores del sistema).
- Consultar el historial de combates.
- Ver perfiles públicos y una clasificación general.
- Compartir un enlace de invitación para incorporar alumnos.
- Usar el juego desde escritorio y móvil sin romper la interfaz.

El MVP original tenía un luchador por cuenta, selección automática de rival y ELO. La etapa 10 lo amplió y la etapa 11 lo rediseña por completo según la sección 4.9: hasta 3 luchadores por cuenta, rivales asignados por la arena, subida de nivel por elección y ninguna clasificación por ELO. Los datos del entorno de prueba se borran; no hay migración.

### 2.2 Después del MVP

Estas funciones se diseñan desde el inicio para poder incorporarlas, pero no se implementan antes de que el MVP esté validado:

- Armas, armaduras, mascotas y habilidades desbloqueables.
- Elecciones de evolución al subir de nivel.
- Varios luchadores por cuenta, selección del luchador propio activo y perfiles privados opcionales.
- Arena con rivales asignados por el servidor (etapa 11).
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

1. Abrir el panel del luchador activo; cambiar a otro luchador propio (hasta 3) cuando se desee.
2. Consultar nivel, experiencia, estadísticas, inventario, combates disponibles y últimos resultados del luchador activo.
3. Si hay una elección de nivel pendiente, resolverla: es obligatorio antes de volver a combatir.
4. Entrar a la arena y elegir uno de los 6 rivales asignados.
5. El servidor valida propiedad, estado, pertenencia del rival a la lista, elección pendiente y cupo diario; después ejecuta la simulación y guarda el resultado.
6. El cliente muestra el combate y su resultado.
7. La XP válida actualiza la experiencia y, al alcanzar el umbral, genera una nueva elección de nivel.
8. La persona puede consultar su historial, otros perfiles públicos y la clasificación; los luchadores privados solo son visibles para su dueño.

### 3.3 Alumnos e invitaciones

#### Comportamiento de las invitaciones (etapa 10, previo al rediseño)

Lo descrito en esta subsección es el comportamiento implementado antes de la etapa 11. La relación `referredByUserId` se conserva; la clasificación `students` pasa a ser una fila por cuenta maestra con alumnos activos (4.6 y 11.7.x), y la visibilidad de las fichas de alumnos sigue la regla de la subsección siguiente.

- Cada luchador recibe un código único; el código identifica al luchador cuyo dueño invita, pero el registro guarda únicamente el ID de la cuenta referente en `referredByUserId`.
- El código es opcional en el registro. Si se proporciona, se normaliza (espacios exteriores y mayúsculas) y debe corresponder a un luchador existente. Un código con formato inválido se rechaza como dato de registro inválido; un código bien formado que no existe se rechaza como invitación inválida y no crea la cuenta.
- Un registro válido vincula la cuenta nueva al dueño del luchador del código. No se guarda qué luchador de esa cuenta originó la invitación. Si una cuenta ya posee varios luchadores, sus códigos atribuyen al mismo referente.
- La atribución se establece al crear la cuenta. Un nuevo registro con credenciales ya usadas entra en conflicto y no sustituye al referente existente. No existe una acción de salida, transferencia o cambio de referente.
- La comprobación de cuenta propia rechaza que el referente resuelto coincida con la cuenta que se registra. En el flujo normal, la cuenta nueva todavía no existe cuando se valida el código.
- Los códigos se pueden reutilizar para registros de cuentas distintas; no hay un límite de aprendices por referente. El registro referido no concede XP, ELO, estadísticas ni otros premios.
- `GET /api/v1/referrals/me` requiere sesión y el luchador seleccionado o único de la cuenta; entrega su código y las cuentas referidas, con nombre de usuario y, cuando puede determinarse, luchador seleccionado (nombre y nivel). En el código actual, esa ficha se incluye sin comprobar su visibilidad.
- La clasificación actual `category=students` devuelve una fila por luchador y calcula para cada fila el número de cuentas cuyo `referredByUserId` apunta al dueño de ese luchador. Por ello, si una cuenta tiene varios luchadores, el mismo total puede aparecer repetido. El desempate actual es por ID de luchador.

#### Reglas aprobadas para el diseño del dojo (10.9.1)

- **Propietario y vínculo:** el dojo pertenece a una cuenta, no a un luchador. Cada código de luchador resuelve a su cuenta dueña. `referredByUserId` es la atribución permanente del aprendiz a una única cuenta maestra y constituye el vínculo directo del dojo; no se crea otra atribución paralela ni se reasignan los registros existentes.
- **Dirección y límites:** cada cuenta puede tener como máximo un maestro directo durante toda su vida, y puede ser a su vez maestra de otras cuentas. Las relaciones son directas, no transitivas: tener alumnos de alumnos no aumenta el total propio. Como el registro solo puede apuntar a una cuenta ya existente y el vínculo es inmutable, no pueden formarse ciclos. Se permiten múltiples aprendices; no hay un máximo de invitaciones por cuenta ni un cupo de aprendices. Los códigos pueden reutilizarse. Se mantienen los controles técnicos existentes de registro y moderación.
- **Autorreclutamiento y cambios:** el servidor debe rechazar siempre un código cuyo dueño sea la propia cuenta que intenta registrarse. La atribución se decide solo en el registro y es inmutable: no se puede salir del vínculo, transferirlo, cambiar de maestro ni volver a atribuirlo a través de otra invitación. Las solicitudes repetidas no crean una segunda relación ni alteran la primera. El estado suspendido o la falta de luchadores no borra el vínculo histórico.
- **Aprendiz que cuenta para la clasificación:** el vínculo se registra al completar el registro aunque el aprendiz todavía no haya creado un luchador. Para contarlo como aprendiz activo se requiere que su cuenta esté activa, tenga al menos un luchador activo y haya completado al menos un combate PvP válido. No se usa la última conexión como medida de actividad. Una cuenta suspendida o sin luchadores activos queda fuera del total activo hasta volver a cumplir las condiciones; la relación histórica se conserva.
- **Visibilidad y clasificación:** el maestro autenticado puede consultar sus aprendices directos y sus nombres de usuario públicos; solo se muestran datos de luchador que sean públicos. La vista pública del dojo y la clasificación muestran el nombre de usuario del maestro y el total agregado de aprendices activos, no la lista ni los datos privados de sus aprendices. La clasificación tiene una fila por cuenta maestra (nunca una por cada luchador), cuenta solo aprendices directos activos y ordena por total descendente, con ID de cuenta ascendente para desempatar. Una cuenta que también sea aprendiz no transfiere a su maestro el crédito de sus propios aprendices.
- **Premios:** no se aprueba ninguna recompensa por invitar, registrarse mediante invitación ni pertenecer a un dojo. No se otorgan XP, ELO, estadísticas, objetos, moneda ni ventajas competitivas por estos hechos. Cualquier recompensa futura requiere una decisión de producto separada que defina de antemano elegibilidad medible, límites, tratamiento de inactividad y suspensión, protección contra duplicados y persistencia idempotente; no se concederá retroactivamente por cambiar de maestro.

#### Escenarios de aceptación del diseño

| Escenario | Resultado requerido |
|---|---|
| Registro con código válido | Se crea una sola atribución al dueño de la cuenta del luchador indicado. |
| Código repetido en registros de cuentas distintas | Cada cuenta nueva puede quedar atribuida al mismo maestro; no se duplica ni modifica una atribución ya persistida. |
| Código propio | Se rechaza; nunca se registra una relación de la cuenta consigo misma. |
| Aprendiz sin luchador activo o sin combate PvP válido | Se conserva el vínculo, pero no suma en la clasificación activa hasta cumplir todas las condiciones. |
| Recompensa duplicada | No aplica: el diseño no aprueba recompensas de dojo. Si se aprueba alguna en una decisión futura, debe registrarse de forma idempotente y única por cuenta/condición. |

### 3.4 Casos de error visibles

La interfaz debe comunicar con claridad, sin mostrar errores técnicos internos:

- Nombre de usuario o luchador ocupado.
- Datos de registro inválidos.
- Credenciales incorrectas.
- Sesión vencida.
- No quedan combates diarios.
- Hay una elección de nivel pendiente que debe resolverse antes de combatir.
- El rival elegido ya no está disponible.
- La cuenta alcanzó el máximo de luchadores.
- No existe el luchador o perfil solicitado.
- No se pudo conectar con el servidor.
- El combate no se pudo procesar; se debe poder reintentar sin cobrar dos veces el mismo intento.

---

## 4. Reglas de juego

Las secciones 4.1–4.7 y 4.9 son el contrato vigente desde la etapa 11. La sección 4.8 describe el diseño de la etapa 10 y se conserva solo como historia: cuando una regla de 4.8 contradiga 4.1–4.7 o 4.9, prevalecen estas. Los valores de balance son configurables en el servidor y solo se modifican mediante cambios explícitos y probados; los valores marcados como provisionales se cierran en 11.8.1.

### 4.1 Luchador

Las reglas de esta sección y de 4.2–4.7 son el contrato vigente desde la etapa 11. Sustituyen a las reglas del MVP y de la expansión de la etapa 10 (4.8 queda como historia hasta que 11.0.3 reemplace sus catálogos).

Cada luchador tiene:

- **Nombre visible único** entre 3 y 18 caracteres: letras (con acentos), números y separadores simples (espacio, guion o guion bajo) entre grupos; sin HTML, emojis ni símbolos. Se conservan las mayúsculas elegidas (`displayName`); la unicidad se evalúa sobre la versión en minúsculas (`name`). La validación del servidor es la autoridad; el cliente valida solo para dar respuesta rápida.
- **Nivel** inicial 1 y **experiencia** inicial 0.
- **Cuatro estadísticas base**, guardadas como puntos enteros: `vida`, `fuerza`, `agilidad` y `velocidad`.
- **Apariencia** (catálogos cerrados y cosméticos de 4.8), **visibilidad** (`public` o `private`) y **estado** (`active` o `suspended`).
- **Inventario** de armas, habilidades y mascotas, con el nivel (tier) de cada perk que fije 11.0.3.
- **Destino**: camino de elecciones de subida de nivel (`destinyPath`) y elección pendiente (4.5).
- Contadores de victorias y derrotas. **No hay empates ni ELO.**
- Código de invitación único.

Significado de las estadísticas (las fórmulas exactas están en la especificación del motor, paso 11.0.2):

| Estadística | Qué hace |
|---|---|
| Vida | Determina la vida máxima. |
| Fuerza | Escala el daño de los golpes. |
| Agilidad | Aumenta la esquiva y la probabilidad de combo. |
| Velocidad | Reduce el tempo: el luchador actúa con más frecuencia. |

**Vida máxima.** Es `max(1, floor(45 + 5 × puntosVida × multiplicadorVida + 3 × nivel))`. `multiplicadorVida` vale 1 y lo modifican únicamente habilidades y mascotas (11.0.3). Una función única del servidor calcula todas las estadísticas derivadas; no se guardan copias calculadas.

**Creación.** El servidor genera el reparto; el cliente solo envía nombre y apariencia. Con un presupuesto de **13 puntos**:

1. `puntosVida` = entero uniforme entre 2 y 5. Restante = 13 − `puntosVida`.
2. `fuerza` = mínimo entre un entero uniforme de 2 a 5 y (restante − 4). Se descuenta del restante.
3. `agilidad` = mínimo entre un entero uniforme de 2 a 5 y (restante − 2). Se descuenta del restante.
4. `velocidad` = lo que queda.

Resultados posibles: vida, fuerza y agilidad entre 2 y 5; velocidad entre 2 y 7; la suma siempre es 13. Ejemplo límite: vida 5, el sorteo de fuerza da 5 pero se limita a 4; quedan 4 puntos, agilidad se limita a 2 y velocidad es 2, es decir (5, 4, 2, 2) con vida máxima `45 + 25 + 3 = 73`. Ejemplo mínimo de vida: vida 2, fuerza 2, agilidad 2, velocidad 7 con vida máxima 58.

Además, el servidor concede **un perk inicial garantizado** (arma, habilidad o mascota por los pesos de 11.0.3), con las mismas reglas de elegibilidad que la subida de nivel. Si el perk es una habilidad potenciadora, se aplica a las estadísticas antes de calcular la vida inicial.

La creación usa una semilla de 32 bytes generada exclusivamente en el servidor (`node:crypto.randomBytes`). Cada sorteo deriva de `SHA-256(semilla || UTF-8(dominio) || uint32BE(contador))`, con rechazo uniforme para evitar sesgo. Dominios: `fighter-creation-v2:stats` y `fighter-creation-v2:perk`. El luchador conserva semilla, versión y resultado. Ningún cliente envía ni altera semilla, estadísticas ni perk.

**Límite por cuenta.** Una cuenta puede tener como máximo **3 luchadores**. Intentar crear un cuarto responde `409 FIGHTER_LIMIT_REACHED` sin consumir nada. Además se conservan los límites técnicos de frecuencia por cuenta e IP. No hay eliminación ni renombrado de luchadores.

**Selección y privacidad.** Al crear un luchador, este pasa a ser el luchador activo de su dueño. Un luchador nuevo es público; su dueño puede hacerlo privado. Un luchador privado no aparece como rival asignado, en perfiles públicos ni en clasificaciones, pero su dueño puede pelear con él. La falta de conexión del dueño no vuelve inactivo al luchador.

### 4.2 Límite diario

- Cada luchador tiene **6 combates por día UTC**, y **8** si posee la habilidad de regeneración.
- El día se calcula en UTC. El contador se reinicia de forma perezosa: si no existe actividad para el `dateKey` de hoy, el límite del día es el máximo vigente; no hay tarea programada.
- El cupo es **por luchador**: no se acumula ni se comparte entre los luchadores de una cuenta, y cambiar el luchador activo no lo renueva.
- Solo consume cupo el luchador que inicia el combate. Que otro luchador lo tenga como rival asignado no consume el suyo.
- La reserva del cupo es atómica. Un rechazo anterior al inicio de la simulación no consume cupo. Un combate iniciado lo consume aunque se pierda.
- El cliente muestra el cupo restante, pero nunca lo calcula como autoridad.
- Ejemplo: un luchador con 6 combates usa el último a las 23:59 UTC y a las 00:00 UTC vuelve a tener 6. El límite del día se recalcula en cada reserva con las habilidades vigentes: un luchador que ya usó 6 combates y obtiene la regeneración ese mismo día dispone de 2 más, ya que `remaining = límite − usados`.

### 4.3 Arena y rivales

- La arena muestra **6 rivales asignados** al luchador activo, ordenados por nombre. Se pelea solo contra uno de ellos; el servidor rechaza cualquier otro objetivo.
- **Composición.** Primero se eligen al azar luchadores públicos y elegibles de **otras cuentas** y del **mismo nivel**. Si faltan, se completan con luchadores de entre 1 y 2 niveles por debajo. Si todavía faltan, se completan con **luchadores del sistema** del nivel del jugador (4.3.1).
- **Persistencia.** La lista se guarda en el luchador y no cambia al recargar. Solo se regenera cuando el luchador **pelea contra uno de sus rivales**, o cuando un rival de la lista deja de ser elegible (privado, suspendido o de una cuenta suspendida): en ese caso se reemplaza únicamente ese rival.
- Se excluyen siempre los luchadores de la propia cuenta, los privados, los suspendidos y los de cuentas suspendidas.
- **Elegibilidad.** El servidor revalida estado, visibilidad, pertenencia a la lista y cupo al aceptar el combate. Un rival que dejó de ser elegible se rechaza antes de consumir cupo con `409 OPPONENT_UNAVAILABLE`.
- No hay catálogo con búsqueda, filtros, rango de ELO ni límite de un combate por pareja: la lista fija es el mecanismo de selección.
- **Ejemplo.** Un luchador de nivel 5 con solo 3 rivales reales de nivel 5 y 1 de nivel 4 recibe además 2 luchadores del sistema de nivel 5. Tras pelear contra uno de ellos, la lista se regenera completa.

#### 4.3.1 Luchadores del sistema

Existen para que la arena nunca esté vacía. Se crean con la misma función de creación y se llevan al nivel pedido aplicando elecciones aleatorias de destino con una semilla del servidor. Pertenecen a ninguna cuenta, no tienen código de invitación, no figuran en clasificaciones ni perfiles públicos y no consumen cupo propio. Los combates contra ellos son combates normales y otorgan XP normal. Su generación exacta se define en 11.5.1.

### 4.4 Motor de combate

El combate se ejecuta íntegramente en el servidor; el cliente solicita el combate y presenta el resultado guardado. El motor es una función de dominio pura, sin Express, React ni MongoDB. El detalle (iniciativa, tiradas y fórmulas) se fija en el paso 11.0.2; esta sección fija el contrato:

1. Se crea una instantánea de ambos luchadores con estadísticas, inventario y versión de las reglas.
2. El servidor genera una semilla y se ejecuta una simulación reproducible: misma entrada, semilla y versión producen el mismo resultado y los mismos eventos.
3. El orden de actuación se determina por una iniciativa en la que el menor valor actúa primero; los empates se resuelven con la semilla.
4. El combate termina cuando un combatiente principal llega a vida 0. **No existen empates.** Existe un tope de seguridad de turnos definido en 11.0.2 que garantiza la finalización con un ganador determinado de forma documentada.
5. El motor produce una secuencia de eventos legible, enumerada en 11.0.2.
6. El resultado, la semilla, la versión del motor y las recompensas se guardan antes de responder con éxito.

La versión inicial del motor es `2.0.0`. Nunca se confía en un resultado, daño, victoria o experiencia calculados por el navegador.

### 4.5 Experiencia, niveles y subida de nivel

**XP por combate** (diferencia = nivel propio − nivel del rival):

| Resultado | Diferencia | XP |
|---|---|---:|
| Victoria | ≤ 2 (rival de nivel parecido o superior) | 2 |
| Victoria | de 3 a 8 | 1 |
| Victoria | > 8 | 0 |
| Derrota | ≤ 8 | 1 |
| Derrota | > 8 | 0 |

**XP necesaria** para pasar del nivel N al N+1: `5 + floor(1,5 × N)` (6 para N = 1, 8 para N = 2, 20 para N = 10). No hay nivel máximo. Cada combate otorga como máximo 2 XP, por lo que un combate nunca cubre dos umbrales.

**Subida de nivel por elección.** Cuando después de un combate `xp ≥ umbral del nivel actual`, el servidor genera **dos opciones** y las guarda como elección pendiente (con su semilla y versión). Mientras haya una elección pendiente, el luchador **no puede iniciar combates** (`409 LEVEL_UP_PENDING`). Al resolverla, el servidor suma 1 al nivel, resta el umbral a la XP y conserva el sobrante.

- **Opción A (perk):** un perk sorteado por peso entre armas, habilidades y mascotas de 11.0.3, restringido a los elegibles (no al máximo, con prerrequisitos cumplidos, sin incompatibilidades).
- **Opción B (estadística):** **+2 puntos** en una sola estadística elegida uniformemente. En vida, cada punto equivale a 5 de vida base.
- **Sustitución:** si no hay perk elegible, o si el nivel es 60 o superior y `rand(0..nivel) ≥ 60`, la opción A se sustituye por **+1 punto y +1 punto en dos estadísticas distintas**. En ese caso el orden de las opciones sigue siendo aleatorio.
- Se mezcla al azar cuál opción aparece a la izquierda y cuál a la derecha. La elección se identifica por `LEFT` o `RIGHT`.
- **Destino.** Cada elección resuelta añade `LEFT` o `RIGHT` a `destinyPath` y se registra con sus opciones, semilla y versión. La elección es **idempotente**: repetir la misma solicitud devuelve el mismo resultado; resolver una elección ya resuelta o inexistente se rechaza.
- Las estadísticas **no tienen tope**. Los perks tienen un máximo de tier fijado en 11.0.3.

Ejemplos: un luchador de nivel 1 con 5 XP gana el combate (+2) → tiene 7, supera 6 y queda con una elección pendiente; al elegir pasa a nivel 2 con 1 XP. Un luchador de nivel 12 que gana contra uno de nivel 2 recibe 0 XP. Un luchador con una elección pendiente que intenta combatir recibe `409 LEVEL_UP_PENDING` y no consume cupo.

### 4.6 Clasificaciones

No hay ELO. Las clasificaciones son públicas, paginadas y excluyen luchadores privados, suspendidos y del sistema:

| Categoría | Orden |
|---|---|
| `level` | nivel desc, victorias desc, ID de luchador asc |
| `wins` | victorias desc, nivel desc, ID de luchador asc |
| `students` | alumnos activos de la cuenta desc, ID de cuenta asc (una fila por cuenta maestra, según 3.3) |

Las categorías `level` y `wins` muestran una fila por cuenta (su mejor luchador para la categoría).

### 4.7 Historial

Cada combate guardado permite ver:

- Fecha y hora en UTC, presentada en la zona local del navegador.
- Nombre, nivel e inventario de ambos luchadores en el momento del combate.
- Ganador y perdedor.
- Secuencia de eventos del motor.
- XP obtenida, si el combate dejó una elección de nivel pendiente y la elección resuelta posteriormente.
- Versión del motor y versión de las reglas.

### 4.8 Contrato aprobado para la expansión de luchadores (histórico, etapa 10)

> **Sección histórica.** Describe el diseño implementado en la etapa 10 (ELO, desafíos dirigidos, equipo con armadura, técnicas y mascotas v1). Queda reemplazada por 4.1–4.7 y 4.9. Los catálogos de equipo, técnicas y mascotas se sustituyen en el paso 11.0.3, y el código que los implementa se retira en 11.1.1. Solo se mantiene de 4.8 la apariencia cosmética (catálogos de tono, cabello, vestimenta y accesorios) y las reglas de «Dojos, invitaciones y límites de abuso».

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
- El equipo inicial no incluye armadura: al crear un luchador, el servidor le concede una sola arma aleatoria de la selección inicial y una técnica aleatoria del grupo inicial definido en «Técnicas automáticas v1». También realiza la tirada de mascota inicial de «Mascotas v1». Los luchadores existentes no reciben técnicas ni mascotas retroactivas. El diseño de armas y armaduras de la expansión se detalla en «Equipo aleatorio v1».
- La creación usa una semilla de 32 bytes generada exclusivamente en el servidor con `node:crypto.randomBytes`; no se aceptan semillas ni elecciones de atributos del cliente. La versión `fighter-creation-v1` deriva cada sorteo del bloque `SHA-256(seed || UTF-8(etiquetaDeDominio) || uint32BE(contador))`, empezando el contador en cero y aumentándolo si hay que rechazar un bloque. El digest se interpreta como entero sin signo big-endian de 256 bits. Para elegir uniformemente entre `N` opciones, se acepta solo un valor menor que `floor(2^256 / N) * N` y se usa su resto módulo `N`; los valores fuera de ese límite se descartan para evitar sesgo. Los dominios de perfil y arma inicial son distintos; las selecciones iniciales de técnica y mascota usan los dominios independientes `fighter-technique-initial-v1` y `fighter-pet-initial-v1`, sin cambiar resultados de otros dominios. El luchador conserva la semilla, versión y resultado para auditar o reproducir la creación. Los sorteos de progreso y desbloqueo también registran semilla, versión y resultado; sus entradas se separan por dominio. Los combates conservan sus snapshots y semilla de simulación. Una misma semilla, entrada y versión produce la misma salida.
- En la progresión de la expansión, las estadísticas se interpretan así: vida (`health`, vitalidad), ataque (`attack`, fuerza), defensa (`defense`, agilidad) y velocidad (`speed`, velocidad). Cada nivel ganado resuelve exactamente una mejora independiente de las tiradas de desbloqueo: el servidor aumenta en **1 punto** una estadística elegible y el jugador no elige el resultado.
- Los pesos iniciales del sorteo son vida **35**, ataque **30**, defensa **20** y velocidad **15** (100 en total). Son pesos relativos: si una estadística alcanza su tope, deja de ser elegible y los pesos restantes se normalizan entre las estadísticas que aún pueden crecer. Un sorteo usa distribución entera ponderada sin sesgo y una entrada aleatoria reproducible/versionada del servidor; el cliente no proporciona semilla, estadística ni magnitud.
- La implementación `fighter-growth-v1` genera en el servidor una semilla independiente de 32 bytes por nivel ganado. Para el nivel destino deriva un entero con `SHA-256(seed || UTF-8("fighter-growth-v1:<nivel>") || uint32BE(contador))` y aplica rechazo uniforme antes de mapearlo a los pesos de las estadísticas elegibles. Cada evento persistido conserva el nivel, semilla, versión, atributo y magnitud (cero si todos los topes ya se alcanzaron) y la clave de la recompensa que lo produjo. Los nuevos luchadores inicializan el estado de progresión al crearse; al progresar por primera vez, los legados guardan como base efectiva sus estadísticas actuales calculadas con la regla fija anterior y mantienen intactos sus `baseStats`.
- Cada estadística puede crecer, respecto a sus `baseStats` iniciales, hasta estos incrementos máximos: vida **+50**, ataque **+20**, defensa **+15** y velocidad **+10**. El tope efectivo es el valor base del luchador más el incremento máximo correspondiente. En luchadores legados, el crecimiento fijo del MVP ya obtenido cuenta para estos límites; si un valor efectivo existente ya supera su tope, se conserva y deja de ser elegible para nuevos aumentos. No se sortean mejoras retroactivas. Al activar la regla, se conservan el nivel, los `baseStats` y las estadísticas efectivas actuales de cada luchador; cada nivel posterior usa esta regla aleatoria.
- En luchadores nuevos, el aumento sorteado se aplica a la estadística base y no se suma además el antiguo bono fijo por nivel. Para luchadores legados, el bono fijo ya obtenido se conserva exactamente una vez como parte de su estado efectivo; los aumentos aleatorios futuros se aplican sin volver a calcular ese bono ni modificar sus `baseStats` originales. Las estadísticas efectivas se calculan en el servidor desde sus valores base, el crecimiento aleatorio y el equipo, sin duplicar bonos derivados del nivel.
- No hay nivel máximo. Al procesar una recompensa, se consume en orden el umbral de cada nivel y se conserva todo el XP restante. Se resuelve una mejora por cada nivel cruzado, incluso cuando una recompensa gana varios niveles. Si una estadística ya llegó a su tope se excluye del sorteo; si todas llegaron, el nivel y el XP siguen avanzando sin aumento de estadísticas. Llegar a un tope nunca descarta XP ni impide procesar otros niveles o desbloqueos.
- Ejemplos con el umbral de XP vigente: nivel 1 con 90 XP que recibe 25 XP termina en nivel 2 con 15 XP restantes y una mejora; nivel 1 con 0 XP que recibe 600 XP termina en nivel 5 con 50 XP restantes y procesa cuatro mejoras, una por cada nivel ganado. En el segundo caso no se garantiza que las cuatro mejoras recaigan en estadísticas distintas: cada sorteo vuelve a considerar los pesos y topes vigentes.
- Comparación con el crecimiento fijo del MVP entre niveles 1 y 5: el MVP añade +20 vida, +2 ataque y +1 defensa; la expansión distribuye cuatro aumentos de +1 según sus pesos y topes, con un máximo total de cuatro puntos en ese tramo. Para un perfil equilibrado inicial (100 vida, 10 ataque, 4 defensa, 5 velocidad), los topes absolutos son 150, 30, 19 y 15, respectivamente. Para cualquier perfil, se calculan sumando sus topes relativos a sus valores base iniciales.
- La creación concede exactamente un arma inicial aleatoria de la selección básica y una técnica inicial aleatoria conforme a «Técnicas automáticas v1». No concede armadura y concede mascota solo según la tirada de «Mascotas v1». Cada nivel ganado produce tiradas independientes de desbloqueo de equipo, técnica y mascota, cada una conforme a su catálogo y dominio aleatorio propios.
- El perfil y el arma inicial se sortean una sola vez al crear el luchador; no se permiten repeticiones ni cambios del resultado después de la creación. Cada desbloqueo se sortea una sola vez por nivel ganado. Un reintento idempotente no repite tiradas ni recompensas. El catálogo de armas y armaduras no ofrece duplicados: si no queda un objeto elegible que el luchador no posea, la tirada no concede objeto y no genera una compensación automática.
- Las reglas de espacio, propiedad, selección automática, efectos, límites y disponibilidad por nivel se describen en «Equipo aleatorio v1» y deberán validarse en el servidor. Poseer un objeto no permite elegirlo ni alterar el combate desde el cliente.
- Las recompensas existentes de XP y ELO del MVP se mantienen salvo que una tarea de balance posterior las cambie explícitamente. Ningún desbloqueo aleatorio se acepta como entrada del cliente ni depende del resultado visual del frontend.

#### Equipo aleatorio v1 (diseño 10.6.1)

Este diseño es original para Fieras de la Arena. Usa solo las estadísticas existentes de vida, ataque, defensa y velocidad; no añade atributos ocultos ni copia nombres, cantidades, cifras, textos o efectos de otros juegos. Las cifras de las tablas y probabilidades marcadas como provisionales son ejemplos de diseño, no balance aprobado ni una afirmación de que las combinaciones se hayan simulado.

**Propiedad y espacios**

- La colección pertenece a cada luchador, no a la cuenta. Cada entrada identifica un objeto único e inmutable del catálogo versionado; poseerlo no significa que se use en todas las peleas.
- Hay dos espacios de combate: un arma y una armadura. En cada combate el servidor sortea como máximo una pieza distinta de cada espacio, de entre las piezas que posee ese luchador. La selección queda fija durante ese combate; el luchador no elige ni cambia equipo entre turnos.
- No se acumulan copias del mismo objeto. Si la tirada de desbloqueo no tiene objetos elegibles sin poseer, no concede nada ni entrega compensación.
- El luchador nuevo recibe una sola arma de inicio y ninguna armadura. Las cuentas antiguas sin inventario siguen pudiendo combatir sin equipo; no se les sortean piezas retroactivas. Sin piezas, no se aplican modificadores de equipo y se usan sus estadísticas base en las reglas de combate versionadas vigentes.
- La colección de habilidades y la de mascotas no son parte de este catálogo: las etapas 10.7 y 10.8 definen su propiedad, adquisición y participación automática por separado.
- Casos revisados: una colección vacía deja ambos espacios en `null` y el combate usa la fórmula vigente; con colección parcial, cada espacio se sortea solo entre sus objetos poseídos; la colección completa no da copias ni compensaciones; un resultado con arma y armadura combina solo una pieza de cada espacio; el replay usa las definiciones snapshot y no consulta valores actuales del catálogo.

**Catálogo inicial propuesto**

Los identificadores son estables; las propiedades se copian al snapshot del combate. Las cuatro primeras armas componen la selección inicial, elegida uniformemente al crear al luchador. El resto y todas las armaduras se obtienen mediante progresión. El nivel mínimo es requisito para entrar en el sorteo de desbloqueo, no una elección del jugador.

| ID | Objeto | Espacio / perfil | Nivel mínimo | Propiedades de combate provisionales |
|---|---|---|---:|---|
| `weapon-caliza-01` | Aguja de Caliza | Arma / ligera | 1 | ataque +1; iniciativa +2; perforación 0; crítico +0 puntos porcentuales |
| `weapon-yunque-01` | Maza de Yunque | Arma / contundente | 1 | ataque +5; iniciativa −2; perforación 0; crítico +0 puntos porcentuales |
| `weapon-estuario-01` | Lanza de Estuario | Arma / alcance | 1 | ataque +2; iniciativa 0; perforación 1; crítico +0 puntos porcentuales |
| `weapon-bruma-01` | Cuchilla de Bruma | Arma / equilibrada | 1 | ataque +3; iniciativa +1; perforación 0; crítico +1 punto porcentual |
| `weapon-polea-01` | Garfio de Polea | Arma / enganche | 3 | ataque +4; iniciativa 0; perforación 1; crítico +0 puntos porcentuales |
| `weapon-campana-01` | Vara de Campana | Arma / ligera | 3 | ataque +2; iniciativa +2; perforación 0; crítico +2 puntos porcentuales |
| `weapon-laja-01` | Disco de Laja | Arma / equilibrio | 4 | ataque +3; iniciativa +1; perforación 1; crítico +1 punto porcentual |
| `weapon-torbellino-01` | Martillo de Torbellino | Arma / contundente | 5 | ataque +6; iniciativa −2; perforación 0; crítico −1 punto porcentual |
| `armor-yute-01` | Manto de Yute | Armadura / ligera | 2 | defensa +1; iniciativa 0 |
| `armor-cañas-01` | Petral de Cañas | Armadura / flexible | 3 | defensa +2; iniciativa 0 |
| `armor-anillos-01` | Cota de Anillos | Armadura / reforzada | 4 | defensa +3; iniciativa −1 |
| `armor-laja-01` | Coraza de Laja | Armadura / pesada | 6 | defensa +4; iniciativa −2 |

El catálogo de esta primera versión contiene ocho armas y cuatro armaduras; no usa rarezas ni duplicados. Los niveles, nombres, propiedades y cantidades de la tabla son propuestas originales para revisión y no cifras finales. Las etiquetas de perfil sirven para lectura y no introducen reglas adicionales.

**Obtención y selección**

- Al crear una ficha se elige uniformemente una de las cuatro armas con nivel mínimo 1, usando un dominio aleatorio separado del perfil inicial. No se otorga armadura.
- Por cada nivel cruzado se hace una tirada independiente de desbloqueo de equipo, distinta del aumento de atributo. Como ejemplo provisional, la probabilidad de desbloqueo es 20 % por nivel. Si tiene éxito, el servidor elige uniformemente un arma o armadura no poseída cuyo nivel mínimo no supere el nivel alcanzado. Si la tirada falla o no hay objetos elegibles, no hay premio de equipo.
- En el combate, el servidor elige uniformemente una de las armas poseídas y, por separado, una de las armaduras poseídas. No hay elección manual, cambio durante la pelea ni acumulación de modificadores de varias piezas. Las tiradas son reproducibles y usan dominios separados para creación, desbloqueo y carga de combate.
- Cada tirada de desbloqueo registra su nivel de origen, semilla/versiones, resultado (objeto o sin premio) y clave de recompensa idempotente; el origen de recompensa por luchador y nivel es único. El sorteo usa el dominio `equipment-unlock-v1:<nivel>`. La selección de carga deriva sus subflujos del seed guardado del combate mediante SHA-256, la etiqueta de dominio y un contador big-endian de 32 bits; usa rechazo uniforme para evitar sesgo.
- La creación y la progresión conservan su idempotencia actual: repetir una solicitud no repite desbloqueos ni añade otra copia. Los rechazos previos al inicio de una pelea no otorgan objetos.

**Modificadores y resolución de combate**

- «Ataque» de un arma se suma a la estadística de ataque para esa pelea; «defensa» de armadura se suma a la defensa del objetivo. «Iniciativa» se suma a velocidad solo para ordenar turnos y el mínimo efectivo es 1. «Perforación» reduce en esa cantidad la defensa aportada por la armadura, sin reducir la estadística base de defensa por debajo de cero. Ningún modificador temporal cambia las estadísticas persistidas del luchador ni su crecimiento de nivel.
- En una acción de ataque se determina primero el resultado de pifia/crítico con una tirada separada: la pifia provisional ocupa el 5 % inferior; el crítico usa a continuación una probabilidad base provisional del 5 %, ajustada por el modificador del arma y limitada provisionalmente al intervalo de 0 % a 15 %; el resto son golpes normales. Las bandas no se solapan. Una pifia consume la acción y causa cero daño; no es un fallo de precisión ni un bloqueo. Un crítico es un golpe que calcula daño y aplica después un multiplicador provisional de 1,5. Arma y armadura no convierten una pifia en crítico ni encadenan acciones adicionales.
- Para un golpe normal o crítico, se calcula primero `floor((ataque + bonificación del arma) × porcentaje / 100)`, con porcentaje entero uniforme de 90 a 110 inclusive; se resta `defensa del rival + max(0, protección de armadura − perforación del arma)` y el daño mínimo del golpe es 1. La perforación solo reduce la protección del objeto, nunca la defensa base del luchador. Al crítico se le aplica luego el multiplicador provisional de 1,5, redondeado hacia abajo y con daño final mínimo de 1. Una pifia no usa esta fórmula.
- El orden de resolución es: fijar snapshots y equipo; calcular iniciativa efectiva y ordenar turnos con el desempate reproducible actual; para cada acción, resolver pifia/crítico; si hubo golpe, sortear el porcentaje de daño, aplicar bonificación, protección y perforación, después el multiplicador crítico y finalmente daño/KO. Se mantienen los límites actuales de acciones y finalización del combate.
- Cada evento de acción identifica si fue pifia, golpe normal o crítico y registra el daño. El snapshot persistido conserva para ambos luchadores el ID y versión de cada pieza sorteada (o `null` si el espacio está vacío), sus propiedades aplicadas, estadísticas previas a equipo, iniciativa efectiva y versiones de catálogo, sorteo de carga y reglas de combate. La semilla de combate deriva subflujos separados por luchador y espacio con la etiqueta `equipment-loadout-v1:<fighterId>:<slot>` y rechazo uniforme; no consume la secuencia aleatoria del motor de combate. La semilla y los dominios separados permiten reproducir selección y pelea; los combates históricos mantienen intactos sus snapshots.
- No hay activaciones de habilidades, mascotas, contraataques encadenados, desarmes, alteraciones de control ni otros efectos por estado en esta etapa. Se diseñan en las etapas 10.7 y 10.8, sin modificar silenciosamente estas reglas de equipo.

#### Técnicas automáticas v1 (diseño 10.7.1)

Las técnicas son efectos originales, automáticos y temporales de combate. La colección pertenece al luchador, no a la cuenta. Ninguna técnica cambia permanentemente atributos, XP, ELO, iniciativa, turnos, equipo o reglas de recompensa. Los valores numéricos de sus efectos y la probabilidad de desbloqueo descritos aquí se aprobaron para la implementación de 10.7.2. El umbral de Manto de Polvo se interpreta como su primer impacto recibido con vida igual o inferior a la mitad; los impactos por encima del umbral no consumen su activación.

**Asignación y selección**

- Al crear un luchador nuevo, el servidor concede exactamente una técnica elegida uniformemente entre las cuatro técnicas iniciales de la tabla. No se admite elección ni repetición desde el cliente. La tirada usa el dominio `fighter-technique-initial-v1`, separado de los dominios de perfil y arma. No se asignan técnicas retroactivamente a luchadores ya existentes.
- Por cada nivel ganado, incluso al ganar varios niveles con una misma recompensa, se hace una tirada independiente de desbloqueo de técnica, distinta de las tiradas de crecimiento y equipo. La probabilidad aprobada es del 20 % por nivel. Si tiene éxito, se elige uniformemente una técnica no poseída cuyo nivel mínimo no supere el nivel alcanzado. El dominio es `fighter-technique-unlock-v1:<nivel>`; semilla, versión, resultado y clave de recompensa idempotente se conservan. Un reintento no repite la tirada. Si la tirada falla o no hay técnicas elegibles, no hay premio ni compensación. No hay duplicados.
- Al inicio de cada combate, el servidor sortea como máximo una técnica pasiva y una activa entre las técnicas poseídas y elegibles del luchador. Cada selección es uniforme, reproducible y usa un subflujo separado de la semilla de combate, con etiqueta por luchador y categoría; no consume la secuencia aleatoria de combate ni de selección de equipo. Si el luchador no posee una técnica de una categoría, ese espacio queda vacío. La colección no se altera por la selección. Los snapshots guardan las técnicas seleccionadas, su versión y sus parámetros aplicados.
- Cada técnica seleccionada puede activarse como máximo una vez por combate. No hay activaciones almacenadas, repetición por turno ni activación después del fin del combate. Las pasivas y activas no consumen acciones, no crean ataques ni disparan otras técnicas. Una técnica que no cumple su condición simplemente no se activa. El máximo es dos activaciones por luchador y cuatro por combate.

| ID | Técnica | Categoría | Nivel mínimo | Objetivo | Condición evaluada por el servidor | Efecto y frecuencia | Contrajuego |
|---|---|---|---:|---|---|---|---|
| `tech-manto-polvo` | Manto de Polvo | Pasiva, inicial | 1 | El propio luchador | El primer impacto enemigo que recibe cuando su vida actual es igual o inferior a la mitad de su vida máxima del snapshot. Los impactos recibidos por encima del umbral no consumen la activación. | Reduce en 2 el daño final de ese impacto; una vez por combate. | No se activa con impactos recibidos por encima del umbral; solo puede reducir un impacto posterior. |
| `tech-ojo-caliza` | Ojo de Caliza | Pasiva, inicial | 1 | Rival | El primer ataque propio que impacta no es crítico. | Añade 2 al daño final de ese impacto; una vez por combate. | No se activa con una pifia ni con un primer impacto crítico. |
| `tech-ritmo-marea` | Ritmo de Marea | Activa, inicial | 1 | Rival | El primer ataque propio que impacta ocurre después de que el rival haya completado al menos una acción. | Añade 2 al daño final de ese impacto; una vez por combate. | Un primer ataque propio antes de la acción rival no activa la técnica. |
| `tech-pulso-bronce` | Pulso de Bronce | Activa, inicial | 1 | El propio luchador | Un impacto enemigo que causa daño final mayor que cero y no es letal deja su vida, después del daño, en la mitad o menos de la vida máxima del snapshot. | Recupera 3 de vida inmediatamente, sin superar la vida máxima inicial; una vez por combate. No revive. | Si el impacto es letal o no causa daño, la técnica no se activa; la recuperación está limitada al máximo inicial. |
| `tech-umbral-arena` | Umbral de Arena | Pasiva | 3 | Rival | Al comenzar una acción propia, la vida actual es igual o inferior a la mitad de la vida máxima del snapshot; el ataque impacta. | Añade 3 al daño final de ese impacto; una vez por combate. | Mantener al luchador por encima del umbral evita su activación; una pifia no cuenta. |
| `tech-guardia-anillos` | Guardia de Anillos | Pasiva | 3 | El propio luchador | El primer impacto crítico enemigo que le alcanza. | Reduce en 2 el daño final de ese impacto; una vez por combate. | No reduce golpes normales ni pifias; no protege contra ataques posteriores. |
| `tech-cuna-estuario` | Cuña de Estuario | Activa | 5 | Rival | Al comenzar una acción propia, el rival tiene vida igual o inferior a la mitad de su vida máxima del snapshot; el ataque impacta. | Añade 3 al daño final de ese impacto; una vez por combate. | El umbral del rival es visible en el estado del combate; un rival por encima de la mitad no activa el efecto. |
| `tech-paso-yunque` | Paso de Yunque | Activa | 5 | El propio luchador | Antes del primer impacto enemigo que recibe, su vida actual es superior a la mitad de su vida máxima del snapshot. | Reduce en 3 el daño final de ese impacto; una vez por combate. | No se activa si ya está en el umbral o por debajo; solo protege contra un impacto. |

**Orden y límites de resolución**

- Para estas reglas, un impacto es un golpe normal o crítico; una pifia no es un impacto. Un golpe sigue siendo un impacto aunque las reducciones de técnicas dejen su daño final en cero. Los umbrales se comparan con enteros: vida igual o inferior a la mitad significa `2 × vidaActual <= vidaMáximaSnapshot`, y vida superior a la mitad significa `2 × vidaActual > vidaMáximaSnapshot`. Así se resuelven sin redondeo los valores máximos impares.
- Los umbrales de vida se comparan con la vida máxima del snapshot, no con estadísticas modificadas durante el combate. Los efectos de ataque se evalúan al comenzar la acción y solo si el golpe impacta; los efectos defensivos se evalúan antes de resolver el impacto; `Pulso de Bronce` se evalúa tras aplicar un impacto no letal que haya causado daño. Una pifia no satisface condiciones de impacto.
- «Pasiva» y «activa» son categorías de resolución, no acciones ni elecciones del jugador: ambas se disparan automáticamente. Las pasivas reaccionan a un impacto recibido o a la condición propia descrita en el catálogo; las activas requieren la acción o el umbral ofensivo descrito. Ninguna técnica puede activarse por una decisión del cliente.
- Para un impacto, primero se calcula el daño base vigente, incluidas arma, armadura, perforación y multiplicador crítico. Después se suma el bono de daño de la técnica ofensiva, se resta la reducción de la técnica defensiva y se limita el resultado al intervalo entre cero y la vida actual del objetivo. El evento de daño registra el valor final. Por tanto, una reducción de técnica puede anular un golpe, pero no cura ni convierte una pifia en impacto; un bono no puede exceder la vida disponible. El orden ofensivo y luego defensivo es fijo si ambas técnicas se activan en el mismo impacto.
- La recuperación ocurre después del daño no letal y antes de la siguiente acción. No altera vida máxima ni estadísticas persistidas; una acción que deja la vida en cero termina el combate y no puede ser revertida. Ningún efecto añade turnos, reinicia la simulación, acumula cargas ni se extiende a otro impacto.
- Cada activación se registra como evento ordenado con ID y versión de técnica, luchador propietario, acción que la disparó, objetivo si lo hay, cantidad aplicada y vidas anterior/posterior cuando corresponda. Los eventos de una técnica no cambian la forma ni el significado de los eventos de combate existentes. Las peleas antiguas sin snapshot de técnicas se siguen leyendo sin reinterpretarlas.
- Las técnicas se resuelven después de fijar el equipo del snapshot. No reemplazan ni alteran arma o armadura, no multiplican efectos de equipo y no modifican iniciativa, crítico, pifia, defensa base, crecimiento ni recompensas. Su bono y reducción son valores planos y de un solo impacto.
- Las ocho técnicas de la tabla anterior no modifican mascotas. Las interacciones de las técnicas antimascota «Red», «Grito de los Condenados» e «Hipnosis» se definen en «Mascotas v1»; se resuelven sin cadenas, copias, cambios permanentes de propiedad ni alteración de otras técnicas.
- Las tablas y probabilidades son propuestas de balance, no resultados de simulación ni cifras finales aprobadas. El catálogo no usa rarezas ni duplicados y sus nombres y descripciones son originales de Fieras de la Arena.

**Análisis de extremos**

| Caso | Resultado definido |
|---|---|
| Luchador sin técnicas poseídas o sin una categoría en su colección | Combate válido; categoría vacía, sin efecto ni evento de activación. |
| Varios niveles cruzados en una recompensa | Una tirada de desbloqueo independiente por nivel, con dominio ligado al nivel; no se repite por reintento. |
| No hay técnicas elegibles sin poseer | No se concede técnica ni compensación, sin duplicados. |
| Condición nunca satisfecha, primera acción es pifia o el combate acaba antes del disparador | No hay activación tardía ni activación forzada. |
| Ataque y defensa se activan en el mismo impacto | Se suma primero el bono ofensivo y después se aplica la reducción defensiva; el daño final se limita a `[0, vida actual]`. |
| El objetivo tiene 1 punto de vida o la reducción supera el daño | El daño no baja de cero ni la vida de cero; una reducción total puede dejar vivo al objetivo. |
| `Pulso de Bronce` coincide con un golpe letal | No se activa y no revive. |
| Se alcanza el máximo de 30 acciones | El combate termina según las reglas vigentes; las técnicas no generan acciones extra ni prolongan el límite. |
| Propietario y rival satisfacen umbrales en el mismo combate | Cada técnica solo puede activarse una vez; no hay interacción recursiva ni transferencia de activaciones. |
| Repetición de petición o lectura de combate histórico | Se conserva el mismo resultado; no se vuelve a sortear la colección ni se reconstruye una técnica histórica desde el catálogo actual. |

#### Mascotas v1 (diseño 10.8.1)

Las mascotas son acompañantes originales que pertenecen a un luchador. Cada una de las tres especies es una sola especie, sin subtipos. Las mascotas no usan armas ni técnicas propias; no reciben bonificaciones de armas y sus golpes no activan técnicas ni efectos encadenados.

**Catálogo y límites de colección**

| Especie | Rareza | Vida | Fuerza | Agilidad | Velocidad | Golpes por activación | Penalización de vida máxima del dueño |
|---|---|---:|---:|---:|---:|---:|---:|
| Perro | Común | 14 | 5 | 5 | 20 | 1–3 | 10 |
| Lobo | Rara | 26 | 10 | 10 | 10 | 2–4 | 25 |
| Oso | Muy rara | 110 | 20 | 5 | 5 | 1 | 40 |

- Un luchador puede poseer hasta tres perros y, además, un lobo o un oso; nunca puede poseer ambos. El máximo es cuatro mascotas. Se permiten perros duplicados dentro del límite; lobo y oso son únicos.
- La colección pertenece al luchador, no a la cuenta. Las mascotas no se eligen para cada pelea: todas las que posee comienzan activas y con su vida máxima. Las que quedan fuera de combate por derrota, red o grito no se pierden y regresan completas en el siguiente combate.
- La mascota no cambia de dueño permanente. Una transferencia por Hipnosis cambia únicamente el bando durante ese combate. La penalización de vida continúa asociada al dueño original.

**Obtención reproducible**

- Al crear un luchador nuevo, hay un **8 %** de probabilidad de recibir un perro. No puede recibir lobo ni oso al crear. La tirada usa el dominio independiente `fighter-pet-initial-v1`; los luchadores existentes no reciben mascotas retroactivas.
- Por cada nivel ganado se hace una tirada independiente de **12 %** para obtener una mascota, incluso si una recompensa hace ganar varios niveles. Si tiene éxito, se elige entre las especies que aún se pueden poseer con pesos perro **96**, lobo **3** y oso **1**. Los pesos de las especies no elegibles se excluyen y los restantes se normalizan. Si no queda ninguna especie elegible, no se concede mascota ni compensación. No se repite la tirada y no se permiten adquisiciones por encima de los límites.
- El sorteo de cada nivel usa el dominio `fighter-pet-unlock-v1:<nivel>`, separado de crecimiento, equipo y técnicas. La semilla, versión, nivel, resultado o ausencia de premio y clave idempotente se conservan para reproducirlo; un reintento no vuelve a tirar.

**Penalización de vida del dueño**

- Cada mascota poseída resta de forma permanente mientras siga en la colección los puntos indicados en el catálogo: cada perro resta 10, el lobo 25 y el oso 40. Los costos se suman por separado; tres perros restan 30 antes de aplicar el piso.
- Sea `H` la vida máxima efectiva del luchador antes del costo de mascotas y `C` la suma de sus costos. La vida máxima resultante es `max(ceil(H * 0.5), H - C)`. El piso de la mitad se redondea hacia arriba. El costo no modifica `baseStats` ni se resta una segunda vez al calcular la pelea; si la vida actual supera el nuevo máximo, se limita a ese máximo.
- Derrotar, atrapar, ahuyentar o transferir temporalmente una mascota no devuelve ni cambia el costo. El costo solo depende de la colección persistente del dueño.

**Contribución y resolución en combate**

- Cada mascota activa ocupa su propio lugar en el orden de actuación, según su velocidad y con los desempates resueltos por la semilla de combate. Un turno de mascota cuenta como una acción hacia el máximo de 30 acciones; sus golpes múltiples no añaden acciones. Cada activación sortea uniformemente, de forma inclusiva, su cantidad de golpes del rango del catálogo.
- La fuerza de cada mascota ocupa el lugar del ataque en la fórmula de daño vigente; se aplican el modificador aleatorio de daño y la defensa del objetivo conforme al motor. Las mascotas no tienen una estadística de defensa: un golpe no esquivado contra ellas usa defensa 0 y conserva el daño mínimo vigente de 1. Cada golpe dirigido a una mascota hace primero una tirada independiente de esquiva con probabilidad `2 % × agilidad` (perro y oso: 10 %; lobo: 20 %). Una esquiva evita por completo ese golpe; la agilidad no reduce también el daño. No se añaden bloqueos ni otras acciones de mascota.
- Cada golpe del luchador rival elige con igual probabilidad entre el luchador objetivo y cada mascota activa de ese bando. Las mascotas fuera de combate o transferidas al otro bando no son objetivos de ese bando. Cada mascota ataca al luchador del bando contrario actual; no hay ataques entre mascotas.
- Solo actúan o pueden ser seleccionadas las mascotas con vida mayor que cero y que no estén atrapadas o ahuyentadas. Al quedar derrotadas, atrapadas o ahuyentadas, dejan de actuar y de recibir ataques por el resto del combate. Las mascotas no prolongan la pelea: sigue vigente el límite de 30 acciones.
- Las armas y mascotas son sistemas separados: no hay multiplicadores ni reglas especiales de arma contra una especie. Las armas resuelven sus ataques conforme al motor y pueden dirigir golpes a mascotas bajo la regla de selección de objetivos anterior.

**Contrajuego antimascota**

Las técnicas son automáticas, no elecciones manuales. Si una de estas técnicas está seleccionada para el combate, su efecto se resuelve al inicio, en orden de velocidad de su luchador; los empates se resuelven mediante la semilla. Cada efecto se activa como máximo una vez por combate. Si no hay mascotas objetivo elegibles, no produce efecto y no se repite.

| Técnica | Efecto |
|---|---|
| Red | Atrapa una mascota activa del bando rival elegida uniformemente. Se ignora durante el resto del combate; no atrapa luchadores ni altera la colección. |
| Grito de los Condenados | Ahuyenta a todas las mascotas activas del bando rival durante el resto del combate. |
| Hipnosis | Transfiere todas las mascotas activas del bando rival al bando de quien la usa. Pueden atacar al antiguo dueño y este puede atacarlas. Cada mascota solo puede cambiar de bando una vez por combate. |

- Estas tres técnicas pertenecen al catálogo versionado `fighter-techniques-v2`; el catálogo v1 se conserva para inventarios y replays anteriores. Las tres son activas, compiten por la única ranura activa y se seleccionan automáticamente entre las técnicas poseídas y elegibles.
- Grito de los Condenados se desbloquea desde nivel 4, Red desde nivel 6 e Hipnosis desde nivel 8. Se incorporan a la tirada de desbloqueo por nivel existente, cuya probabilidad general sigue siendo 20 %. Si el sorteo general tiene éxito y hay candidatas normales y antimascota, primero se elige el grupo: 85 % normal y 15 % antimascota. Si solo un grupo tiene candidatas elegibles no poseídas, recibe el 100 % del sorteo.
- Dentro del grupo normal se mantiene la selección uniforme existente. Dentro del grupo antimascota se usan pesos Grito **5**, Red **3** e Hipnosis **1**; las técnicas no elegibles o ya poseídas se excluyen y los pesos restantes se normalizan. Las semillas, versiones, niveles, resultados y claves idempotentes se conservan. El sorteo nuevo usa `fighter-technique-unlock-v2:<nivel>`; las recompensas v1 existentes mantienen su versión.
- Los efectos se aplican en orden de velocidad; al resolver cada técnica, se consideran las mascotas que en ese momento están activas en el bando rival. Red y Grito no provocan pérdida permanente. Una mascota no se duplica ni puede volver a transferirse durante la misma pelea.
- Las técnicas antimascota seleccionadas se resuelven antes de la primera acción; si ambas se activan, el orden es la velocidad de sus luchadores y los empates usan la semilla. Red elige uniformemente una mascota activa; Grito afecta a todas las activas; Hipnosis transfiere todas las activas que aún no hayan cambiado de bando en ese combate. Si no hay objetivo elegible, la técnica no se activa ni consume su uso.
- Al terminar el combate, las mascotas atrapadas o ahuyentadas regresan a su colección y las transferidas vuelven al bando de su dueño original; todas recuperan la vida máxima para la próxima pelea. Las técnicas no revierten la penalización de vida de sus dueños.
- No se incluyen bomba, técnicas que potencien mascotas ni efectos de equipo específicos contra ellas en esta versión.

**Casos límite definidos para verificación**

| Caso | Resultado |
|---|---|
| Sin mascotas | Combate normal entre luchadores, sin objetivos ni acciones de mascota. |
| Una mascota | Entra desde el comienzo, actúa según su velocidad y puede ser objetivo de cada golpe rival. |
| Perros duplicados | Se permiten hasta tres; cada uno conserva su propia vida y acción. Sus costos se suman. |
| Intento de obtener una especie bloqueada o superar cuatro mascotas | Se excluye la especie antes del sorteo ponderado; no se exceden los límites ni se repite una tirada fallida. |
| Costos acumulados por encima del límite | La vida máxima del dueño no baja del 50 % de `H`, con redondeo hacia arriba. |
| Esquiva con varios golpes | Cada golpe recibido por una mascota tiene su propia tirada reproducible; una esquiva no evita los golpes siguientes. |
| Hipnosis combinada con derrota, red o grito | No se crean copias ni cambios persistentes; solo las mascotas activas cambian de bando, y los efectos posteriores siguen el orden de velocidad. |
| Fin del combate | El estado de combate de las mascotas se reinicia; colección, dueño original y costo de vida se conservan. |

#### Dojos, invitaciones y límites de abuso

- La relación de invitación actual sigue perteneciendo a la cuenta y permanece única e inmutable; al introducir el dojo no se reasigna, duplica ni multiplica por cada luchador de esa cuenta.
- Según el diseño aprobado en 10.9.1 y documentado en la sección 3.3, el dojo es una relación entre cuentas y reutiliza `referredByUserId`; los códigos siguen perteneciendo a luchadores únicamente para resolver la cuenta maestra. Un maestro es una cuenta, no cada uno de sus luchadores.
- El vínculo se asigna al registrarse, es único e inmutable, y no admite autorreferencias, transferencias ni ciclos. Una cuenta puede ser aprendiz y maestra de otras cuentas; el conteo es directo, no transitivo.
- No se aprueban recompensas de dojo. No hay premios competitivos ni cosméticos/sociales, ni recompensas retroactivas. Una decisión futura debe definir primero las condiciones medibles y controles contra duplicados; la sección 3.3 establece los requisitos mínimos.
- La unicidad e idempotencia del servidor se aplican a creación, desafíos, progresión y desbloqueos. Si una decisión futura aprobara recompensas de dojo, cada evento tendría que tener origen único y no podría liquidarse dos veces, ni por concurrencia ni al repetir solicitudes.
- Los controles contra automatización incluyen límites por cuenta e IP, validación y autorización en servidor, no aceptar propiedad/estadísticas/recompensas desde el cliente, restricciones a desafíos repetidos, exclusión de luchadores privados como rivales y de luchadores o cuentas suspendidos de cualquier participación, registro de decisiones y moderación. La privacidad no oculta la aplicación de estas reglas al servidor.

### 4.9 Rediseño de la etapa 11 (contrato vigente)

Esta sección recoge las decisiones aprobadas para rehacer el juego tomando como referencia **la mecánica** del remake comunitario de *El Bruto* (investigación en `docs/research/el-bruto-investigacion-tecnica.md`). Los pasos 11.0.x concretan sus números; hasta entonces, todo valor marcado como provisional no se implementa.

#### Principio de originalidad

Se adaptan **sistemas y estructura de fórmulas** (iniciativa por tempo, esquiva por diferencia de agilidad, combos, armas con tipos, súper con usos, refuerzos, árbol de destino). **No se copian** nombres de armas, habilidades, rangos, tablas de valores, código, sprites, sonidos ni textos del juego original ni del remake (su código es PolyForm Noncommercial y sus recursos CC BY-NC-SA). Catálogos, cifras, arte y textos son propios. Las técnicas y cifras de etapas anteriores que coinciden con el original («Red», «Grito de los Condenados», «Hipnosis», 14/26/110 de vida de mascotas) se renombran y reajustan en 11.0.3.

#### Decisiones aprobadas

| Tema | Decisión |
|---|---|
| Datos existentes | Se **borra todo** (cuentas, luchadores, combates) en el entorno de prueba. No hay migración ni compatibilidad con datos de la etapa 10. El reinicio de la base de Render ocurre solo en 11.8.3 y con confirmación explícita. |
| Código legado | Se unifica en **una sola API**: se eliminan rutas `/api/v1` duplicadas, `legacyFighter`, `migrateFighterOwnershipV1`, el `userId` legado de `DailyActivity`, el motor 1.x, el matchmaking automático, el rival de entrenamiento y las armaduras (11.1.1). |
| Estadísticas | Vida, **fuerza**, **agilidad** y velocidad. La defensa plana desaparece; la agilidad aporta esquiva y probabilidad de combo, la velocidad reduce el tempo (más turnos). |
| Motor | Motor **2.x** nuevo, determinista con semilla. Orden por iniciativa (menor actúa primero), pelea hasta KO con tope de seguridad de turnos, **sin empates**. Defensas: esquiva, bloqueo, contraataque, reversión; ofensivas: combo, crítico, desarme, lanzamiento de arma. Sin armaduras: la reducción de daño viene de habilidades. |
| Armas | Un luchador posee varias; en combate **saca y cambia** armas con probabilidad ponderada (incluida la opción de pelear sin arma). Tipos: rápida, pesada, larga, afilada, contundente, arrojadiza. |
| Habilidades | Potenciadores de estadística, pasivas y súper con usos limitados; incluyen contramedidas contra mascotas y refuerzos. Niveles de perk acotados por 11.0.3. |
| Mascotas | Tres especies con costo de vida para el dueño, reajustadas a valores propios. |
| Refuerzos | Un luchador propio de menor nivel puede acudir como refuerzo con una habilidad específica (11.2.6). |
| Creación | Reparto aleatorio con presupuesto de puntos y un perk inicial garantizado. **Máximo 3 luchadores por cuenta**, además de los límites técnicos por cuenta e IP. Se conservan nombres únicos, apariencia, selección activa y privacidad. |
| Subida de nivel | Al subir, el jugador **elige 1 de 2 opciones**: un perk (arma, habilidad o mascota) o un aumento de estadísticas. La ruta se guarda como árbol de destino (`destinyPath`) y es obligatorio resolver la elección antes de volver a pelear. Si el perk sorteado no es elegible, la opción se sustituye por +1/+1 en dos estadísticas. |
| XP | Victoria o derrota otorgan XP pequeña y según diferencia de nivel; cero XP contra rivales muy inferiores. Curva de nivel y valores exactos en 11.0.1. |
| Arena | **6 rivales asignados y persistidos**, de nivel igual o ligeramente inferior, ordenados por nombre. La lista solo se regenera al pelear contra uno de ellos. Si faltan rivales reales se completa con luchadores generados por el sistema; esas peleas cuentan como normales. Se excluyen rivales privados, suspendidos o de la propia cuenta. Se elimina el catálogo con búsqueda y el rango de ELO. |
| Cupo diario | **6 combates por luchador y día UTC**, +2 con la habilidad de regeneración. El contador se reinicia de forma perezosa por fecha, sin tarea programada. Se eliminan el límite por pareja y el cupo especial del primer día. |
| ELO | **Se elimina.** No hay ELO ni desafíos por rango. Las clasificaciones son por nivel, victorias y alumnos activos; el rango de torneo queda fuera de esta etapa. |
| Torneos, clanes, jefes, oro | Fuera de alcance de la etapa 11. |
| Dojo | Se mantiene el diseño 10.9.1 (relación entre cuentas, `referredByUserId`, sin premios). Se implementa en 11.7.x. |
| Presentación | Primero se adapta la animación actual a los eventos 2.x (11.6.1); después una arena 2D en canvas con personajes y efectos originales, por etapas (11.6.2 y 11.6.3). |
| Combates y reproducibilidad | Se conservan semilla, versión de motor, snapshots, eventos, idempotencia por `requestId` y transacciones. La semilla por dominio SHA-256 de la creación sigue vigente. |

#### Reglas de las etapas 0–10 superadas

- 4.1 estadísticas iniciales fijas y 4.8 perfiles iniciales (Resistente/Equilibrado/Vitalidad).
- 4.2–4.3 cupo por cuenta, selección automática y rival de entrenamiento.
- 4.4 motor `1.x` (30 acciones, defensa plana, empates) y 4.6 ELO.
- 4.8 catálogo de rivales con ±200 ELO, 5 desafíos diarios y límite por pareja, crecimiento de +1 estadística automático, equipo de un arma y una armadura sorteadas por combate, técnicas de una pasiva y una activa y mascotas v1.
- Sección 6 (`Fighter.elo`, `Battle` con ELO, `DailyActivity.userId`) y sección 7 (`/api/v1/*` y `/api/v2/arena/opponents|challenges`): se reescriben en 11.0.1 y 11.3.1 y se sustituyen por una única API.

#### Estado de la definición

Aprobado en 11.0.1 y escrito en 4.1–4.7, 6 y 7: estadísticas y presupuesto de creación, fórmula de vida, límite de 3 luchadores, curva y reglas de XP, subida de nivel por elección, arena de 6 rivales, cupo diario, clasificaciones sin ELO, modelo de datos y contrato de la API única bajo `/api/v1`.

Pendiente: tiradas y fórmulas del motor y forma exacta de los eventos (11.0.2); catálogos de armas, habilidades, mascotas y refuerzos, sus pesos y tiers (11.0.3); y el cierre de balance de todos los valores marcados como provisionales (11.8.1).

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
- `game-engine/`: reglas puras de combate, progreso y creación de luchadores; sin HTTP ni acceso directo a la base de datos.
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

- API REST única bajo `/api/v1`.
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
- `activeFighterId` opcional y nullable: selección del luchador activo propio. Una cuenta sin luchador no tiene selección; al crear el primero queda seleccionado. Si el campo es nulo o apunta a un luchador ajeno o inexistente, las operaciones que lo necesitan responden `409 NO_ACTIVE_FIGHTER`; nunca se elige otro arbitrariamente.
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

Representa a un personaje jugable. Una cuenta puede poseer hasta 3.

- `_id`
- `userId`: dueño; no es único. `null` solo para luchadores del sistema.
- `kind`: `player` o `system`.
- `name` normalizado y único; `displayName` con las mayúsculas elegidas.
- `level`, `xp`.
- `stats`: puntos enteros `vida`, `fuerza`, `agilidad` y `velocidad`. Las estadísticas derivadas (vida máxima, tempo, etc.) no se guardan: las calcula una función única.
- `appearance`: elecciones cosméticas cerradas.
- `status`: `active` o `suspended`.
- `visibility`: `public` o `private`.
- `inventory`: `weapons`, `skills` y `pets`, cada entrada con su identificador de catálogo y su tier cuando 11.0.3 lo defina.
- `destinyPath`: lista de `LEFT` o `RIGHT`, una por nivel ganado.
- `pendingLevelUp`: `null` o `{ level, options: [opciónIzquierda, opciónDerecha], seed, version, createdAt }`.
- `levelUps`: registro de elecciones resueltas, con nivel, lado, opciones, semilla, versión y `requestId`.
- `creation`: semilla, versión y resultado de la creación.
- `opponents`: lista de IDs de los rivales asignados y `opponentsGeneratedAt`.
- `wins`, `losses`.
- `referralCode` único (ausente en los luchadores del sistema).
- `createdAt`, `updatedAt`.

Reglas: una cuenta no puede superar 3 luchadores `player` (se comprueba en el servidor dentro de la misma transacción que crea el documento). No se guardan nunca el ELO ni los empates. Los luchadores del sistema no tienen dueño, ni código de invitación, ni visibilidad pública.

### 6.3 Battle

Registro inmutable del resultado.

- `_id`
- `status`: `completed`.
- Snapshots de ambos luchadores: ID, nombre, nivel, puntos de estadísticas, inventario completo con tiers y estadísticas derivadas calculadas para la pelea.
- `requesterFighterId`, `opponentFighterId` y `requestId`.
- `winnerFighterId` y `loserFighterId` (siempre definidos).
- `seed`, `engineVersion`, `snapshotVersion` y versión de los catálogos.
- `events` ordenados.
- `result`: XP otorgada al iniciador, nivel y XP antes y después, y si dejó una elección de nivel pendiente.
- `createdAt`.

La combinación `requesterFighterId + requestId` es única. La clave queda ligada al rival y al contenido validado: un reintento idéntico devuelve el combate persistido sin consumir otro cupo ni repetir recompensas; reutilizar la clave con otro contenido responde `409 IDEMPOTENCY_KEY_REUSED`. La creación del combate, la reserva de cupo y la actualización del luchador se confirman en **una única transacción**; si falla cualquier escritura, no se conserva el combate ni las recompensas.

El historial nunca depende del estado actual de un luchador para explicar un combate anterior. Un replay usa su `engineVersion` y su `snapshotVersion`.

### 6.4 DailyActivity

Controla los combates iniciados por luchador y día.

- `_id`
- `fighterId`
- `dateKey`: fecha UTC `YYYY-MM-DD`.
- `limit`: límite efectivo del día (6, u 8 con regeneración).
- `battlesUsed`
- `requestIds` reservados ese día y los identificadores de los combates aceptados.
- `createdAt`, `updatedAt`

Índice único `fighterId + dateKey`. La reserva es atómica y comprueba disponibilidad. Los luchadores de una misma cuenta tienen cupos independientes.

### 6.5 Relaciones de invitación

La atribución del maestro al aprendiz se representa con `User.referredByUserId`; los códigos de `Fighter` resuelven al dueño de la cuenta que invita. Es también la relación directa del dojo de 3.3. Si más adelante hiciera falta una colección para métricas, deberá conservar una sola atribución por cuenta y ser idempotente. No hay recompensas de dojo.

### 6.6 Índices

- User: `username` único y `email` único.
- Fighter: `userId + createdAt + _id` no único para listar luchadores propios, `name` único, `referralCode` único parcial (solo cuando existe), `visibility + status + kind + level + _id` para candidatos a rival, y índices por `level` y `wins` para clasificaciones.
- Battle: fecha descendente, `requesterFighterId + createdAt` y `requesterFighterId + requestId` único.
- DailyActivity: `fighterId + dateKey` único.

Cada índice se crea en el paso de desarrollo de su modelo. La elegibilidad de la cuenta dueña se comprueba al consultar; el índice no es una autorización.

### 6.7 Reinicio de datos

No hay migración desde la etapa 10: el entorno de prueba se reinicia y los datos anteriores no se leen. El paso 11.1.1 añade un script de reinicio de la base **local**. El reinicio de la base de Render se ejecuta solo en 11.8.3, con confirmación explícita del usuario y tras comprobar que existe una copia si se desea conservarla. Ninguna instancia reinicia datos automáticamente al arrancar.

---

## 7. API REST

Desde la etapa 11 existe **una sola API bajo `/api/v1`**; no hay rutas `/api/v2` ni selección implícita de luchador. Las operaciones que actúan sobre un luchador reciben su ID y comprueban propiedad en el servidor. Cada grupo se desarrolla únicamente cuando lo indique `ROADMAP.md` y `CURRENT_STEP.md`.

| Método | Ruta | Sesión | Propósito |
|---|---|---:|---|
| `GET` | `/api/v1/health` | No | Verificar que el servidor responde y el estado de la base |
| `POST` | `/api/v1/auth/register` | No | Crear cuenta, aceptar invitación opcional y abrir sesión |
| `POST` | `/api/v1/auth/login` | No | Iniciar sesión |
| `POST` | `/api/v1/auth/logout` | Sí | Destruir la sesión |
| `GET` | `/api/v1/auth/me` | Sí | Consultar la cuenta autenticada |
| `GET` | `/api/v1/fighters` | Sí | Listar los luchadores propios (hasta 3), con estado, visibilidad y elección pendiente |
| `POST` | `/api/v1/fighters` | Sí | Crear un luchador: recibe `{ name, appearance, requestId }` |
| `GET` | `/api/v1/fighters/active` | Sí | Devolver el luchador activo o `null` |
| `PUT` | `/api/v1/fighters/active` | Sí | Recibe `{ fighterId }` y selecciona un luchador propio no suspendido |
| `PUT` | `/api/v1/fighters/:id/visibility` | Sí | Recibe `{ visibility }` y cambia la privacidad de un luchador propio |
| `GET` | `/api/v1/fighters/:id` | No | Ficha pública de un luchador público, elegible y de cuenta activa |
| `GET` | `/api/v1/profiles/:username` | No | Colección de luchadores públicos de una cuenta |
| `GET` | `/api/v1/fighters/:id/level-up` | Sí | Elección de nivel pendiente de un luchador propio, o `null` |
| `POST` | `/api/v1/fighters/:id/level-up` | Sí | Recibe `{ choice, requestId }` con `choice` igual a `LEFT` o `RIGHT` y resuelve la elección |
| `GET` | `/api/v1/arena/opponents` | Sí | Los 6 rivales asignados al luchador activo |
| `GET` | `/api/v1/arena/attempts` | Sí | Cupo diario `{ fighterId, dateKey, limit, used, remaining }` del luchador activo |
| `POST` | `/api/v1/arena/fights` | Sí | Recibe `{ fighterId, opponentFighterId, requestId }` y resuelve un combate |
| `GET` | `/api/v1/arena/history` | Sí | Historial paginado de los luchadores propios |
| `GET` | `/api/v1/battles/:id` | Condicional | Detalle de un combate para sus participantes autorizados, o público si ambos luchadores son públicos |
| `GET` | `/api/v1/leaderboards` | No | Clasificación paginada (`level`, `wins` o `students`) |
| `GET` | `/api/v1/referrals/me` | Sí | Código de invitación de la cuenta y resumen de sus alumnos |

### Requisitos de la API

- Validar toda entrada en el servidor y rechazar propiedades no admitidas.
- Aplicar límites de frecuencia a registro, inicio de sesión, creación de luchadores y combates; los contadores se guardan en MongoDB y el 429 informa `Retry-After`.
- Paginación en historial y clasificaciones: `page` por defecto 1 y `limit` por defecto 20, máximo 50. La respuesta es `{ items, pagination: { page, limit, totalItems, totalPages } }` con el nombre de colección propio de cada ruta.
- No aceptar del cliente `userId`, XP, nivel, estadísticas, ganador, perk ni elección de rival fuera de la lista asignada.
- No revelar correos ni permitir averiguar si una contraseña es correcta.
- Los identificadores enviados por el cliente nunca demuestran propiedad. Toda operación autenticada sobre un luchador filtra por `userId` de la sesión; si el ID existe pero no es propio, responde como inexistente. Las rutas públicas consultan solo luchadores públicos y elegibles, y responden `404` igual para inexistentes y privados.

### Contrato de las operaciones principales

**`POST /api/v1/fighters`.** Valida el nombre (3 a 18 caracteres) y la apariencia contra el catálogo, comprueba el límite de 3 luchadores y crea el luchador con el reparto de 4.1. Responde 201 con el luchador completo. Repetir el mismo `requestId` con el mismo nombre normalizado devuelve el luchador existente; con otro nombre responde `409 IDEMPOTENCY_KEY_REUSED`. Un nombre ocupado responde `409 FIGHTER_NAME_TAKEN`; un cuarto luchador, `409 FIGHTER_LIMIT_REACHED`. Los umbrales de frecuencia son `FIGHTER_CREATION_ACCOUNT_LIMIT` (5), `FIGHTER_CREATION_IP_LIMIT` (30) y `FIGHTER_CREATION_WINDOW_MS` (una hora).

**`GET /api/v1/arena/opponents`.** Devuelve `{ fighters }` con exactamente los rivales asignados al luchador activo (hasta 6), ordenados por nombre. Cada elemento contiene `id`, `name`, `username` (vacío para luchadores del sistema), `level`, `appearance`, `wins` y `losses`; no incluye XP, estadísticas ni inventario. Si la lista guardada tiene rivales no elegibles, el servidor los reemplaza antes de responder. Sin luchador activo responde `409 NO_ACTIVE_FIGHTER`.

**`POST /api/v1/arena/fights`.** Antes de reservar cupo verifica, en este orden: sesión y estado de la cuenta, propiedad y elegibilidad del iniciador, que el iniciador sea el luchador activo de la cuenta, que no tenga una elección de nivel pendiente (`409 LEVEL_UP_PENDING`), que el rival esté en su lista asignada y siga elegible (`409 OPPONENT_UNAVAILABLE`) y que haya cupo (`409 DAILY_BATTLES_EXHAUSTED`). Cualquier rechazo anterior a la simulación no consume cupo. Reserva el cupo, ejecuta el motor, guarda el combate, aplica XP y, si corresponde, crea la elección pendiente, todo en una transacción. Responde con el combate persistido. La clave `requestId` queda ligada a `fighterId`, `opponentFighterId` y al contenido validado: un reintento idéntico recupera el mismo combate aunque la selección activa cambie después; la misma clave con otro contenido responde `409 IDEMPOTENCY_KEY_REUSED`. Tras el combate, la lista de rivales se regenera según 4.3.

**`POST /api/v1/fighters/:id/level-up`.** Exige que el luchador sea propio y tenga una elección pendiente. Aplica la opción elegida, suma 1 al nivel, resta el umbral de XP, añade el lado a `destinyPath` y registra la resolución con su `requestId`. Repetir la misma solicitud devuelve la resolución ya aplicada; una elección inexistente responde `409 NO_LEVEL_UP_PENDING`. La respuesta devuelve el luchador actualizado con las estadísticas efectivas calculadas en el servidor.

**`GET /api/v1/arena/history`.** Lista combates de cualquiera de los luchadores propios; cada elemento incluye `ownFighterId` para identificar al luchador propio que participó. La autorización se basa en la propiedad de los luchadores participantes.

**`GET /api/v1/battles/:id`.** El detalle autorizado incluye, por participante, nivel y XP antes y después, y si dejó una elección pendiente. No expone semillas ni claves de idempotencia. Un combate con un luchador privado solo es visible para sus participantes autorizados.

**`GET /api/v1/leaderboards`.** Acepta `category` (`level` por defecto, `wins` o `students`), `page` y `limit`. Los empates se resuelven como indica 4.6. Cada fila incluye únicamente campos públicos y el nombre de usuario.

**Registro.** Acepta `username`, `email` y `password`, y opcionalmente `referralCode`. El código debe corresponder a un luchador existente; la nueva cuenta queda vinculada de forma permanente al dueño de ese luchador, y se rechaza si pertenece a la propia cuenta. Un código desconocido se rechaza con HTTP 400. Un registro correcto crea una sesión, regenera el identificador de sesión y devuelve HTTP 201 con `id`, `username` y `email` públicos y la cookie de sesión. Los conflictos de nombre o correo devuelven el mismo HTTP 409 para no distinguir cuál valor está ocupado.

**Inicio de sesión.** Acepta únicamente `identifier` (nombre de usuario o correo) y `password`.

### Códigos de error de juego

| Código | HTTP | Cuándo |
|---|---:|---|
| `FIGHTER_LIMIT_REACHED` | 409 | La cuenta ya tiene 3 luchadores |
| `FIGHTER_NAME_TAKEN` | 409 | El nombre normalizado ya existe |
| `IDEMPOTENCY_KEY_REUSED` | 409 | El `requestId` se reutilizó con contenido distinto |
| `NO_ACTIVE_FIGHTER` | 409 | La cuenta no tiene luchador activo |
| `LEVEL_UP_PENDING` | 409 | Hay una elección de nivel sin resolver |
| `NO_LEVEL_UP_PENDING` | 409 | Se intentó resolver una elección inexistente |
| `OPPONENT_UNAVAILABLE` | 409 | El rival no está en la lista o dejó de ser elegible |
| `DAILY_BATTLES_EXHAUSTED` | 409 | El luchador no tiene cupo |

### Escenarios que deben verificarse

- **Cuenta nueva sin luchador:** no tiene selección; al crear el primero queda activo.
- **Luchador privado:** el dueño puede leerlo, seleccionarlo y combatir con él; los endpoints públicos, las clasificaciones y las listas de rivales lo tratan como inexistente.
- **Luchador ajeno por ID:** responde como inexistente, igual que un ID desconocido.
- **Elección pendiente:** impide combatir, no consume cupo y se resuelve una sola vez aunque se repita la petición.
- **Rival fuera de la lista:** se rechaza sin consumir cupo, aunque exista y sea público.
- **Reintento con la misma clave:** devuelve el mismo combate sin segundo cupo ni segunda XP.
- **Combate antiguo:** se lee con su `engineVersion` y sus snapshots, sin reinterpretarlo con datos actuales.

---

## 8. Frontend y navegación

### 8.1 Rutas de interfaz previstas

- `/` — página inicial pública.
- `/register` — registro.
- `/login` — inicio de sesión.
- `/create-fighter` — creación de un luchador (hasta 3 por cuenta) desde la cuenta autenticada.
- `/dashboard` — resumen del luchador activo propio, sus luchadores, su inventario y accesos principales.
- `/level-up` — elección entre las dos opciones de subida de nivel; se presenta cuando hay una pendiente.
- `/arena` — los 6 rivales asignados, el cupo restante y la acción para combatir contra uno.
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
- Limitar creación de luchadores y combates por cuenta e IP, con umbrales técnicos configurables, además del máximo de 3 luchadores por cuenta.
- Verificar en cada combate que el rival pertenece a la lista asignada y sigue siendo elegible, que no hay una elección de nivel pendiente y que hay cupo.
- No permitir que un usuario cambie sus propias recompensas, XP, estadísticas, elecciones de nivel, rol o relación de invitación mediante una petición manipulada.

### 9.3 Combates sin trampas

- Simulación y cálculo de recompensas solo en servidor.
- Semilla generada por el servidor y registro de `engineVersion`.
- Instantáneas de participantes.
- Idempotencia para evitar duplicar recompensas al repetir una petición.
- Cada recompensa, subida de nivel y desbloqueo se identifica por su evento de origen; peticiones repetidas o concurrentes no vuelven a procesar el mismo evento.
- Operaciones de actualización relacionadas ejecutadas de forma coherente. Si se necesita transacción MongoDB, comprobar primero los requisitos del entorno; no fingir atomicidad.
- Los luchadores del sistema usan el mismo motor y las mismas reglas que los demás; no reciben ventajas ni existen resultados predefinidos.
- Registrar errores operativos sin exponer secretos ni datos innecesarios.

### 9.4 Privacidad

- Los luchadores son públicos por defecto; el dueño puede marcarlos privados. La privacidad excluye al luchador de páginas públicas, clasificaciones y de las listas de rivales asignados, pero no impide que su dueño autenticado lo use para combatir contra sus rivales asignados. Si participa un luchador privado, el combate solo es visible para los participantes autorizados y no aparece en consultas públicas.
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
- La pelea siempre termina con un ganador y nunca supera el tope de seguridad de turnos.
- La vida no se reduce por debajo de cero en los valores presentados.
- Daño mínimo de 1 cuando se produce un impacto.
- El reparto inicial de estadísticas suma siempre 13 y respeta los rangos de 4.1.
- La XP por combate sigue la tabla de 4.5 para cada diferencia de nivel.
- Alcanzar el umbral de XP genera una elección pendiente; resolverla sube el nivel una vez y conserva la XP sobrante.
- La sustitución +1/+1 se aplica cuando no hay perk elegible.
- Pelea duplicada no concede recompensas por segunda vez.

### 11.2 Pruebas de API e integración

- Registro válido y rechazo de datos inválidos.
- Nombre y correo duplicados.
- Inicio y cierre de sesión.
- Rutas privadas sin sesión devuelven `401`.
- Un usuario puede crear hasta 3 luchadores y el cuarto responde `FIGHTER_LIMIT_REACHED`, sin perder la autorización por propietario.
- Límite diario y peticiones simultáneas.
- Un combate contra un rival fuera de la lista asignada se rechaza sin consumir cupo.
- Una elección de nivel pendiente impide combatir y se resuelve una sola vez.
- No se puede modificar la identidad del luchador objetivo ni enviar recompensas desde el cliente.
- Perfiles inexistentes y paginación inválida.

### 11.3 Pruebas de interfaz

- Formularios con datos válidos e inválidos.
- Sesión persistente al recargar y limpieza al cerrar sesión.
- Estados de carga y error visibles.
- Adaptación a ancho móvil.
- Un usuario sin luchador es enviado al flujo de creación; con luchadores, puede crear y seleccionar hasta 3.
- Con una elección de nivel pendiente, la interfaz dirige a resolverla antes de combatir.

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
- Desde la etapa 11, una cuenta tiene hasta 3 luchadores, cada uno con 6 combates diarios (8 con regeneración) según UTC. Los luchadores son públicos por defecto y se selecciona uno activo.
- El jugador combate contra uno de los 6 rivales que la arena le asigna; no hay ELO ni búsqueda de rivales.
- Experiencia y nivel se calculan en el servidor; al subir de nivel el jugador elige entre dos opciones.
- Registro de usuarios y perfiles públicos.
- Invitaciones/alumnos con relación persistente por cuenta, sin bonus competitivo ni cosmético/social aprobado.
- La semilla y versión del generador permiten reproducir creación, progresión y combate aleatorios.
- No hay recompensas de dojo aprobadas. Cualquier recompensa requerirá una nueva decisión de producto con condiciones medibles y protección contra abuso.
- Las decisiones aún no implementadas no autorizan a Copilot a anticipar trabajo.

### Valores de balance pendientes

- Los catálogos de armas, habilidades, mascotas y refuerzos y las tiradas del motor 2.0 se definen en 11.0.2 y 11.0.3, y sus valores se cierran con simulaciones en 11.8.1.
- Los valores de 4.1–4.5 (presupuesto de 13 puntos, vida base 45 y 5 por punto, curva de XP, umbrales de 2 y 8 niveles) son los aprobados en 11.0.1 y se reconfirman en 11.8.1.
- Límites técnicos de frecuencia de creación y umbrales de detección de automatización.
- Posibles recompensas futuras del dojo; no están aprobadas ni se conceden hasta una decisión de producto explícita.

### Revisiones futuras permitidas

Se puede ajustar balance, estética, nombre, estructura de recompensas y alcance. Todo cambio que afecte arquitectura, modelos, API o reglas debe actualizar este documento y las pruebas relacionadas antes de implementarse.

### Propuestas futuras no priorizadas

- **Evaluar elecciones manuales de recompensas al subir de nivel:** estudiar si una versión futura debería ofrecer alternativas de objetos o mejoras para que la persona elija, frente al sorteo automático definido para la primera versión. Es una propuesta pendiente de evaluación, sin ID, orden, dependencia ni autorización de implementación; no modifica el paso 10.6 ni la regla vigente de progresión automática.

---

## 14. Regla final del proyecto

**La especificación define lo que se construye; `ROADMAP.md` define el orden; `CURRENT_STEP.md` define la única tarea autorizada ahora; `.github/copilot-instructions.md` define cómo debe trabajar Copilot.** Si hay una contradicción o falta un requisito importante para el paso activo, Copilot debe detenerse y señalarla en vez de improvisar o adelantarse.
