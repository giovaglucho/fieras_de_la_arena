# El Bruto (La Brute / My Brute): investigación técnica

**Fecha:** 2026-11-16 · **Propósito:** entender cómo estaba construido el juego de referencia para tomar decisiones de diseño propias en *Fieras de la Arena*. No es una especificación para copiarlo (ver §11).

---

## 0. Resumen ejecutivo

- **Qué era:** un juego de navegador de Motion Twin (Burdeos, Francia), lanzado en **junio-julio de 2008** como *La Brute* (labrute.fr). Se tradujo como *My Brute* (inglés) y *El Bruto* (español). Hubo un port a iOS/Android de Bulkypix (2009). [S1][S2][S3]
- **Tecnología original:** cliente **Flash** compilado desde **Haxe**, el lenguaje creado en Motion Twin. Lo más probable es que el servidor corriera sobre **Neko/Tora**, pero eso es una inferencia que ninguna fuente confirma para La Brute en concreto. [S2][S11][S12]
- **Dos generaciones con reglas distintas:**
  - **V1 (labrute.fr / mybrute.com):** 3 combates por día, 2 XP por victoria y 1 por derrota, y sistema de **pupilos** que daba XP al maestro.
  - **V2 (portal Muxxu):** 10 combates por día o hasta 3 heridas, 1 XP por combate, un **árbol de destino binario** en cada nivel, ascenso de rango por torneo con reinicio a nivel 1, y opciones pagas. [S2][S5][S6]
- **Cierre:** Motion Twin anunció el 27-03-2020 que cerraría sus juegos Flash; los últimos juegos web cerraron el **02-11-2023**. [S2][S7]
- **Mejor fuente técnica disponible:** el remake abierto de **Eternaltwin** (`Zenoo/labrute`, TypeScript + Express + Prisma/Postgres + React/Pixi). Tiene el motor de combate completo y legible, pero **no es el código original**. Rebalancea y agrega sistemas que el original no tenía: niveles de perk T1–T3, clanes, oro, jefes, eventos y modificadores diarios. Las fórmulas de §5 salen de ahí y se deben leer como "reconstrucción moderna", no como "verdad del original". [S8][S9]

### Nivel de confianza por tema

| Tema | Confianza | Por qué |
|---|---|---|
| Bucle de juego, combate automático, pupilos, torneos | Alta | Coinciden Wikipedia EN/FR, wikis de fans, blogs de 2008 y el remake |
| Límites diarios y XP por combate | Media | Varían según la versión (V1, V2 o remake) y las fuentes no siempre aclaran cuál describen |
| Fórmulas exactas de combate | Media-baja respecto al original | Solo hay código del remake; el original sigue cerrado (el código publicado en 2022 no aparece documentado para La Brute) |
| Arquitectura del servidor original | Baja | Solo se infiere a partir de la pila de Motion Twin |

---

## 1. Historia y versiones

| Hito | Fecha | Fuente |
|---|---|---|
| Inicio del proyecto y publicación en labrute.fr | 25-06-2008 (FR Wikipedia) · blog del 18-07-2008 que ya lo llama "buzzgame" | [S2][S4] |
| Versión inglesa *My Brute* en mybrute.com | Wikipedia EN dice "marzo de 2009" (probable fecha de la versión EN) | [S1] |
| Port iOS/Android (Bulkypix) | 2009 | [S1][S2] |
| V2 en el portal Muxxu | Sin fecha exacta | [S2] |
| Anuncio del fin de Flash | 27-03-2020 | [S2][S7] |
| Juegos publicados bajo CC-BY-NC-SA | 20-04-2020 | [S2] |
| Publicación de "parte del código" de juegos Twinoid | 09-08-2022 | [S2][S10] |
| Cierre definitivo de los juegos web de Motion Twin | 02-11-2023 | [S7] |
| Remake Eternaltwin (TypeScript) | Repositorio creado en enero de 2023 y todavía activo (v2.101.x, noviembre de 2026) | [S8][S9] |

**Discrepancia:** Wikipedia EN da marzo de 2009 como fecha de lanzamiento, pero un blog francés de julio de 2008 y Wikipedia FR muestran que el juego ya existía en 2008. Lo más probable es que 2009 sea la fecha de la versión inglesa.

---

## 2. Arquitectura técnica

### 2.1 Original (Motion Twin, 2008–2023)

- **Cliente:** animaciones de combate en **SWF (Flash Player)** compiladas desde **Haxe**. El resto del sitio eran páginas HTML: la "celda" del bruto, la arena y las clasificaciones. [S2][S11]
- **Servidor:** no hay documentación pública. Motion Twin desarrolló NekoVM y el servidor de aplicaciones **Tora**, así que lo razonable es suponer un backend Haxe/Neko. **No está confirmado.** [S12]
- **Identidad y URLs:** cada bruto tenía un subdominio propio (`nombre.mybrute.com`, `nombre.labrute.fr`) y su página de celda en `/cellule`. Ese enlace era a la vez la página de perfil y el **enlace de reclutamiento de pupilos**. [S5][S4]
- **Cuentas:** en V1 se creaban brutos sin registrarse. Eran públicos por defecto y se protegían con una contraseña opcional. [S1] El antifraude usaba la **IP**: solo el primer pupilo creado desde una IP daba XP al maestro. [S5]
- **Operación:** había ventanas diarias de mantenimiento con el sitio cerrado. [S5]
- **Protocolo cliente-servidor:** un bot comunitario para Muxxu capturó el tráfico con Burp Suite y lo reprodujo con cookies de sesión. Por eso se sabe que las acciones eran **peticiones HTTP simples con sesión por cookie** y que el servidor exponía vida, fuerza, agilidad, velocidad, habilidades, armas, energía, heridas y victorias. [S13]
- **Recursos originales:** Eternaltwin conserva los SWF y las imágenes en `gitlab.com/eternaltwin/labrute/labrute-original-assets`. [S14]

**Conclusión:** el modelo era **autoritativo en el servidor**. El jugador solo elegía a quién desafiar; el servidor resolvía el combate y el cliente Flash lo reproducía. Todas las fuentes sobre el juego lo confirman ("combates completamente automáticos, sin intervención del usuario") [S1], y el remake lo implementa igual: simulación en el servidor y reproducción en el cliente.

### 2.2 Remake Eternaltwin (la referencia técnica legible)

Monorepo pnpm con cuatro paquetes [S9]:

| Paquete | Responsabilidad |
|---|---|
| `prisma` | Esquema y cliente generado (PostgreSQL) |
| `core` | Reglas compartidas: catálogos de armas, habilidades y mascotas, fórmulas de XP y HP, constantes y tipos |
| `server` | Express: API, **simulación de combate**, torneos y trabajo diario (cron `0 0 * * *`) |
| `client` | React + MUI, **Pixi.js** para reproducir combates, audio, i18n |

**Separación clave del combate** (`docs/engineering/fights.md`) [S9]:

1. **Estado detallado de simulación** (servidor, mutable): `generateFight.ts` y `fightMethods.ts`.
2. **Protocolo persistido:** `Fight.fighters` (estado inicial) y `Fight.steps` (lista de pasos con claves compactas como `a` = acción). Se guardan como **texto JSON** en Postgres.
3. **Estado de animación** (cliente): `Fight.runStep` despacha cada `StepType` a animaciones. Admite *seek*, pausa y *rewind*.

Reglas de compatibilidad que documenta el remake: los IDs numéricos de `StepType`, de las armas y de las habilidades **nunca se renumeran**, porque eso cambiaría la interpretación de combates históricos. [S9]

Otros aspectos de la plataforma remake: login OAuth vía Eternaltwin; CSRF también en GET; *fingerprint* del navegador y detección de multicuenta; bloqueo de peticiones en proceso por usuario. [S9]

---

## 3. Modelo de datos (persistencia)

Del esquema Prisma del remake [S8]. Solo se listan los campos que reflejan mecánicas del original.

**Brute**
- Identidad: `id`, `name`, `gender`, `body` (11 caracteres que codifican partes del cuerpo), `colors` (96 caracteres).
- Progresión: `level`, `xp`.
- Atributos: `hpStat`, `hpModifier`, `hpValue`, y la misma terna para `strength`, `agility` y `speed`. La terna es *stat base*, *multiplicador de habilidades* y *valor final*.
- Inventario: `weapons[]`, `skills[]`, `pets[]`.
- Destino: `destinyPath` (lista de LEFT/RIGHT), `ranking` (11 → 0), `ascensions`.
- Social: `master` y `pupils` (autorrelación), `pupilsCount`.
- Arena: `fightsLeft`, `lastFight` (fecha), `opponents[]` (rivales asignados y persistidos), `opponentsGeneratedAt`.
- Torneos: `registeredForTournament`, `tournamentWins`, `canRankUpSince`.
- Historial: `victories`, `losses`.

**Fight:** `brute1`, `brute2`, `winnerId`, `loserId`, `steps` (texto), `fighters` (texto), `modifiers[]`, `background`, `tournamentId`, `tournamentStep`.

**Log:** el feed de la celda. Tipos de entrada: victoria o derrota, nuevo pupilo (`child`), subida de nivel de un pupilo (`childup`), subida de nivel propia (`up`), torneo. Guarda la XP ganada y una plantilla de texto aleatoria (48 plantillas).

**DestinyChoice:** cada nodo del árbol binario de destino guarda su `path` y su contenido (perk, o stat1/stat2 con sus valores). Así el árbol se puede **repetir** al reiniciar tras un ascenso.

**Tournament:** `date`, `type` (DAILY, GLOBAL, …), `participants`, `rounds`, `fights`.

---

## 4. Creación del personaje

| Aspecto | Original (fuentes de fans y Wikipedia) | Remake |
|---|---|---|
| Apariencia | Nombre, género, ropa, peinado, accesorios y color de piel [S1] | `body` y `colors` codificados; aleatorios y editables |
| Stats iniciales | Aleatorios [S1] | Presupuesto de **11 puntos**: HP 2–5 puntos (cada uno vale ×6), fuerza 2–5, agilidad 2–5, y lo que sobra va a velocidad |
| Perk inicial | Aleatorio: arma, habilidad o mascota | Un perk ponderado por rareza, garantizado |
| Penalización por mascota | Perro −10 HP, lobo/pantera −23 HP [S6] | Multiplicador de HP: perro 0,9, pantera 0,75, oso 0,6 |
| HP máximo | — | `max(1, floor(50 + hpStat × hpModifier + 2 × nivel))` |

Comportamiento emergente: como todo es aleatorio, la estrategia dominante era **crear muchos brutos y quedarse con el mejor** (*rerolling*). [S6]

---

## 5. Motor de combate

> Todas las fórmulas de esta sección salen del remake [S8]. El original seguía la misma lógica cualitativa (agilidad para esquivar, armas rápidas que encadenan golpes, armas pesadas lentas), según los wikis de fans [S6], pero sus números exactos no se conocen.

### 5.1 Planificador por iniciativa (tipo ATB)

- Cada combatiente (bruto, mascota o refuerzo) tiene un valor de `initiative`. **Siempre actúa el que tiene la iniciativa más baja**; si hay empate, se decide al azar.
- Iniciativa inicial: `(rand(0..10) − velocidad) / 100`. Las mascotas tienen su propio valor (el oso actúa muy tarde).
- Después de actuar, el combatiente suma a su iniciativa: `tempoArma × tempoBruto + rand(0..10)/100`. El tempo del bruto depende de la velocidad: `0,10 + 0,90 × 20 / max(1, 10 + 1,5 × velocidad)`. El tempo base sin arma es 1,2.
- Límite de seguridad: 2000 turnos; a partir del turno 1000 el combate pasa a *overtime*.

### 5.2 Turno de un combatiente

1. Expiran los estados del turno anterior: red (atrapado) y aturdimiento.
2. Si tiene regeneración o metabolismo, se cura una vez.
3. Puede activar al azar un **súper** que todavía tenga usos. Hay filtros contextuales: la poción trágica solo con HP < 50 %, el domador solo si perdió más del 20 % del HP, el ladrón solo si el rival tiene un arma.
4. **Sacar arma:** sorteo ponderado por el campo `toss` de cada arma, más un peso de 10 para "no sacar".
5. Tipo de ataque: con un arma arrojadiza el ataque siempre es a distancia. Con otras armas, la probabilidad de lanzarla es `1 / (round(33 − tempo × 5) + 1)`, más alta cuanto más lenta es el arma.
6. Elige un rival vivo al azar.
7. **Contraataque** previo del rival: `(counter × 10 + diferenciaDeAlcance) × 0,1`, con tope de 90 %.
8. Ataque: evasión, luego bloqueo, luego daño, desarme y reversión.
9. Combo: puede repetir el golpe con probabilidad `combo + agilidad × 0,01`.

### 5.3 Defensas

| Tirada | Fórmula (éxito si `rand < valor`) | Tope |
|---|---|---|
| **Evasión** | `evasión + clamp((agiDefensor − agiAtacante) × 2, −40, 40) / 100 − precisión − destreza` | 90 % |
| **Bloqueo** (solo brutos, nunca mascotas ni jefes) | `bloqueo − precisión`; base del bruto −0,25 | 90 % |
| **Reversión** (contragolpe tras recibir) | `reversal`; con *contraataque* tras bloquear sube hasta +0,9–0,99 | 90 % (sin la habilidad) |
| **Desarme** | `disarm × 100 ≥ rand(1..100)`, mitigado por `weaponGrip` | — |
| **Desvío de proyectiles** | `deflect` | 90 % |

Stats base del bruto sin arma: evasión 0,1 · destreza 0,2 · bloqueo −0,25 · desarme 0,05 · tempo 1,2 · crítico 5 % ×1,5.

### 5.4 Daño

```
cuerpo a cuerpo = floor((base + FUE × (0,2 + base × 0,05)) × U(0,8; 1,2) × multHabilidades)
arrojadiza      = floor((base + FUE × 0,1 + AGI × 0,15) × U(1,0; 1,5) × multHabilidades)
crítico         → × daño crítico (base 1,5)
armadura        → × (1 − min(armadura, 0,9))   (no se aplica a arrojadizas)
mínimo 1
```

`base` es el daño del arma o 5 a mano limpia. Bruto feroz multiplica ×2 y el martillo (*piledriver*) ×4.

### 5.5 Muerte y victoria

Un combate termina cuando el **bruto principal** de un equipo cae. Las mascotas y los refuerzos no cuentan para la victoria. La habilidad *supervivencia* deja al bruto con 1 HP la primera vez que recibe un golpe mortal. [S6][S8]

---

## 6. Catálogo de elementos

### 6.1 Atributos

| Atributo | Efecto |
|---|---|
| **Vida (HP)** | Aguante. Las mascotas la reducen y *vitalidad* e *inmortal* la aumentan. [S6] |
| **Fuerza** | Escala el daño. Los fans resumían "1 de fuerza ≈ 1 de daño"; en el remake la escala depende del arma. |
| **Agilidad** | Esquiva (por diferencia con el rival) y probabilidad de combo. [S6] |
| **Velocidad** | Frecuencia de turnos, porque reduce el tempo. [S6] |

### 6.2 Armas (26)

Las 26 armas coinciden en nombre en Wikipedia EN, el wiki de fans y el remake. [S1][S6][S8] Tipos: rápida, afilada, pesada, larga, arrojadiza y contundente.

Valores del remake en nivel T1. "Rar." es el peso relativo de aparición; "alc." es el alcance. Al lado va el rango de daño que medían los fans en el original.

| Arma | Tipos | Rar. | Tempo | Daño T1 | Alc. | Rasgos destacados | Daño (fans, V1) |
|---|---|---|---|---|---|---|---|
| Espada ancha (broadsword) | afilada | 100 | 1,2 | 10 | 1 | bloqueo, crítico 30 % | 8–15 |
| Cuchillo | rápida, afilada | 80 | 0,6 | 7 | 0 | combo, destreza | 6–11 |
| Bastón (baton) | larga | 70 | 1,0 | 6 | 3 | reversión, bloqueo, desarme | 5–9 |
| Bumps (garrote) | pesada, contundente | 50 | 2,0 | 30 | 1 | sin combo | 35–50 |
| Hacha de mano (hatchet) | pesada, afilada | 40 | 1,5 | 17 | 1 | crítico | 16–20 |
| Lanza | larga | 40 | 1,2 | 12 | 3 | contraataque por alcance | 12–19 |
| Hueso de mamut | pesada, contundente | 20 | 1,6 | 14 | 1 | precisión | 15–25 |
| Tridente | larga | 10 | 1,4 | 14 | 3 | desarme | 13–19 |
| Shuriken | arrojadiza | 8 | 0,12 | 3 | 0 | ráfagas de lanzamientos | 3–8 |
| Lucero del alba | pesada, contundente | 6 | 1,5 | 20 | 1 | precisión | 20–30 |
| Sai | rápida | 6 | 0,6 | 8 | 0 | **desarme 75 %**, bloqueo | 6–11 |
| Cimitarra | afilada | 6 | 0,8 | 10 | 1 | combo | 15–25 |
| Mayal (flail) | pesada, contundente | 4 | 2,2 | 36 | 1 | **precisión 150 %** | 45–55 |
| Espada (sword) | afilada | 4 | 1,8 | 28 | 2 | — | 25–45 |
| Hacha de piedra (axe) | pesada, contundente | 3 | 2,3 | 55 | 1 | daño máximo, muy lenta | 50–75 |
| Látigo | larga | 3 | 1,5 | 10 | **5** | evasión, desarme | 10–15 |
| Alabarda | larga, pesada, afilada | 2 | 1,8 | 24 | 4 | — | 21–40 |
| Abanico | rápida | 2 | 0,28 | 4 | 0 | evasión, reversión, desvío | 2–6 |
| Sartén, teclado, puerro, taza, raqueta, trombón, cuenco de fideos, Piou-Piouz | varios | 0,4 c/u | — | — | — | armas "muy raras" y humorísticas | — |

Comportamientos documentados por fans [S6]:
- Las armas rápidas encadenan golpes y son difíciles de esquivar.
- Las lentas casi no combinan ni bloquean.
- Las pesadas se benefician de *brazo fuerte* y las penaliza *esqueleto de plomo*.
- Las arrojadizas solo se lanzan.
- *Maestro de armas* da bonus a las armas cortantes.

### 6.3 Habilidades (*specialities* y *supers*)

**Original:** el wiki de fans y Wikipedia EN listan **28 habilidades**. Los *supers* se usan una vez por combate, salvo bomba y ladrón. [S1][S6]

| Clase | Habilidades (nombre de fans) | Efecto (fans, con valores del remake entre paréntesis) |
|---|---|---|
| **Potenciadores de stat** | Fuerza hercúlea, Agilidad felina, Rayo (velocidad), Vitalidad, Inmortal | +stat plano y porcentual (+3 y +50 %). Inmortal: +250 % HP y −25 % al resto |
| **Pasivas ofensivas** | Maestro de armas, Artes marciales, Implacable (precisión), Tornado de golpes (combo), Impacto (desarme), Sabotaje (rompe armas), Brazo fuerte (pesadas) | Daño con afiladas +50 %, a mano limpia +100 %, etc. |
| **Pasivas defensivas** | Escudo (bloqueo +45 %, daño −25 %), Armadura (armadura +25 %, velocidad −15 %), Piel extra gruesa (+10 % de armadura), Intocable (+30 % de evasión), Sexto sentido (contraataque), Pugnaz (devuelve el golpe), Supervivencia (sobrevive con 1 HP) | — |
| **Supers** | Bruto feroz (daño ×2), Poción trágica (cura), Red (inmoviliza), Bomba (área), Martillo (agarre, daño ×4), Grito de los condenados (espanta mascotas), Hipnosis (roba mascotas), Diluvio (lanza todas las armas), Ladrón (roba el arma) | Usos por combate limitados |

**Remake:** amplía el catálogo a **55 habilidades**. Agrega talentos como regeneración (+2 combates por día), chef, espía, saboteador, refuerzo, escondite y monje, además de vampirismo, cadena, prisa, mímica, *rewind* y otras. Todas tienen niveles T1–T3. [S8] Esas incorporaciones **no forman parte del original**.

Restricción del remake: la probabilidad de un segundo potenciador baja a 5 %, la de un tercero a 2 % y la de los siguientes a 0,1 %, para evitar brutos rotos. [S8]

### 6.4 Mascotas

| Mascota | Original (fans) [S6] | Remake T1 [S8] |
|---|---|---|
| **Perro** (hasta 3) | Común. 14 HP, daño similar al cuchillo, 1–3 golpes por turno. Al dueño le quita −10 HP | Pesos 20/8/2 (perro 1, 2, 3), HP 14–16, combo 0,2–0,3. El perro 2 requiere el 1 y el 3 requiere el 2 |
| **Lobo / Pantera** | Muy raro (≈0,3 %). Unos 26 HP, 2–4 golpes de 9–13. Al dueño le quita −23 HP | Peso 1. HP 26, agilidad 16, velocidad 24, combo 0,7 |
| **Oso** | El más raro (≈0,6 % empírico). 110 HP, 1 golpe de 19–27, lento | Peso 1. HP 110, fuerza 40, iniciativa +3,6, sin combo |

**Discrepancia de nombres:** Wikipedia EN dice "perros, lobos y osos". El juego mostraba un **lobo gris** en el sprite, pero lo llamaba "pantera" al otorgarlo; el remake usa `panther`. [S1][S6][S8]

Las mascotas actúan con iniciativa propia, tienen HP propio y no pueden bloquear. Funcionan como "escudo de carne" del dueño. Contramedidas: red, bomba, grito de los condenados e hipnosis. [S6]

---

## 7. Progresión

### 7.1 Experiencia y niveles

| Fuente de XP | V1 (labrute.fr / mybrute.com) | V2 (Muxxu) | Remake |
|---|---|---|---|
| Victoria en la arena | **2 XP** contra un rival "comparable" (como mucho 2 niveles por debajo); 1 XP en otro caso | 1 XP | 2 XP si la diferencia de nivel es ≤ 2; 1 XP si es mayor |
| Derrota | 1 XP | 1 XP y 1 **herida** | 1 XP |
| Rival más de 10 niveles por debajo | — | — | 0 XP |
| Nuevo pupilo | +1 XP para el maestro (solo el primero por IP) | Sistema eliminado | Solo un registro en el feed |
| Subida de nivel de un pupilo | +1 XP para el maestro | — | Solo un registro en el feed |
| Torneo | 1 XP por ronda ganada | — | +1 XP por ronda y oro |
| Fuentes | [S5][S6] | [S2][S13] | [S8] |

**Curva de XP por nivel:**
- V1, tabla de fans: 4, 8, 12, 16, 21, 26, 32, 37, 43… para pasar a los niveles 2, 3, 4… Es decir, unos 199 XP acumulados para llegar al nivel 10 y unos 982 para el 20, con un crecimiento ligeramente superlineal. [S6]
- Remake: `floor(1,2 × nivel + 3)` (5, 6, 7, 9, …, 15 para el nivel 10). La XP vuelve a 0 en cada subida. Es una curva mucho más plana, compensada con menos XP por combate. [S8]

### 7.2 Subida de nivel

- **V1:** la recompensa se asignaba **automáticamente** al azar: +stat, o una posibilidad de arma, habilidad o mascota. El jugador no controlaba nada. [S1][S6]
- **V2 y remake:** **dos opciones** en cada nivel. El conjunto forma un árbol binario (`destinyPath`):
  - Opción A: un perk (arma, habilidad o mascota), sorteado por peso entre todo el catálogo. Si el perk está bloqueado (ya está al máximo, o es un perro sin su prerrequisito), se ofrece **+1/+1** en dos stats distintos.
  - Opción B: **+2** en un solo stat. Si el stat es vida, cada punto vale ×6.
  - El orden de A y B se mezcla al azar.
  - Desde el nivel 80, la probabilidad de recibir un perk va bajando.

  [S2][S8]

### 7.3 Rango y torneos

**Rangos (12 niveles).** Van de *Padawan* (11) a *Leyenda brutal* (0). En V1 el rango reflejaba **la ronda alcanzada** en el torneo: llegar a la final daba Leyenda brutal, a semifinales *Dentista del caos*, y así hacia abajo. [S6]

| Aspecto | V1 | V2 | Remake |
|---|---|---|---|
| Inscripción | Manual, en una ventana corta | 1 torneo por día | Inscripción para el día siguiente |
| Formato | Eliminación directa entre todos los inscritos. Las primeras rondas emparejan por nivel similar; luego es aleatorio | Agrupado por rango | Grupos de **64**, completados con brutos generados por el sistema |
| Horario | Empieza hacia las 4 h, una ronda por hora y la final a las 21 h | — | Se resuelve en el trabajo de medianoche; el jugador ve los pasos uno a uno |
| Premio | Rango y aparición en la clasificación | **Subir de rango ⇒ reinicio a nivel 1**, con la opción de repetir el mismo destino o pedir uno nuevo | `tournamentWins` acumula victorias y habilita el ascenso (ascensión) |
| Fuentes | [S5][S6] | [S2][S6] | [S8] |

### 7.4 Límites diarios

| Versión | Combates por día | Fuente |
|---|---|---|
| V1 | 3 (6 el día de creación) | [S1][S6] |
| V2 (Muxxu) | 10 (20 pagando 0,25 €) o hasta 3 derrotas o heridas; la enfermería costaba 15 fichas | [S2][S3] |
| Remake | 6 (8 con regeneración) | [S8][S15] |

En el remake, el contador se reinicia de forma **perezosa**: si `lastFight` cae en otro día UTC, `fightsLeft` vuelve al máximo. No hace falta un cron. [S8]

---

## 8. Interacciones sociales

- **Selección de rival:**
  - V1: lista aleatoria de rivales; solo se veía su HP, salvo que el jugador abriera su celda en otra pestaña. Había un buscador por prefijo de nombre (mínimo 3 caracteres). [S5][S6]
  - Remake: **6 rivales del mismo nivel**, completados con rivales de hasta 2 niveles menos. La lista **se persiste** y solo se regenera cuando el jugador pelea contra uno de ellos, lo que impide refrescarla hasta encontrar al más débil. [S8]
- **Pupilos y maestro:** era la viralidad del juego en V1. El enlace del bruto creaba pupilos; el maestro ganaba XP y mostraba su número de pupilos. Problemas que generó: *farming* con cadenas de cuentas, mitigado por IP, y bots de referidos. Por eso V2 lo eliminó. [S2][S5][S6]
- **Rival fijo:** el combatiente desafiado no tiene que estar conectado. Pelea su "fantasma" guardado y ambos reciben un registro en su feed. [S8]
- **Repeticiones:** cualquier combate se puede volver a ver. V2 agregó un "canal de TV" con combates favoritos. [S2][S4]
- **Clanes:** en MyBrute los clanes se medían por la suma de los niveles de sus miembros y había que tener nivel 10 para crear uno. No daban ventajas en el juego. [S6] El remake agrega jefes, guerras de clanes y ELO.

---

## 9. Comportamientos emergentes y problemas observados

1. **Reroll masivo:** como el personaje es puro azar, la estrategia óptima era crear cientos de brutos. [S6]
2. **Farming de pupilos:** cuando la XP social es gratis, aparecen cuentas fantasma. Hizo falta antifraude por IP y luego eliminar el sistema. [S2][S5]
3. **Brutos de nivel bajo y stats altos** que eran producto del farming; se pedía a los jugadores que los denunciaran. [S6]
4. **Bug de mascota con vitalidad o inmortal:** recibir una mascota recalculaba el HP y lo hacía caer a unos 60. Muestra que el HP se derivaba de una fórmula con multiplicadores aplicados en un orden frágil. [S6]
5. **Crítica principal:** la falta de control durante el combate limita la profundidad, y el tope diario frustra. Lo mejor valorado: la simplicidad, sesiones cortas, el humor visual y lo social. [S1]
6. **Bots:** jugadores que automatizaron la elección de rivales con redes neuronales y lograron unos 15 % más de victorias. [S13]

---

## 10. Contradicciones entre fuentes

| Tema | Versiones | Interpretación |
|---|---|---|
| Año de lanzamiento | 2008 (FR Wiki, blog) frente a 2009 (EN Wiki, MobyGames) | 2008 en Francia; 2009 la versión inglesa |
| Combates por día | 3, 5, 6, 10 o 20 | Depende de la versión: V1 = 3, V2 = 10, remake = 6 |
| XP por victoria | 2 frente a 1 | V1 = 2 (contra un rival comparable); V2 = 1 |
| Número de habilidades | 28 frente a 42 frente a 55 | 28 en el original; los números mayores son ampliaciones de Muxxu o del remake |
| Lobo o pantera | Mismo animal | El sprite es un lobo y el nombre interno es pantera |
| Torneo y XP | "No da XP" frente a "1 XP por ronda" | Las páginas del wiki de fans se contradicen entre sí; el remake da 1 XP por ronda |

---

## 11. Implicaciones para Fieras de la Arena

Coherentes con [PROJECT_SPEC.md](../../PROJECT_SPEC.md) §1.1, que exige identidad propia y no copiar recursos:

- **Licencias:** el código del remake está bajo **PolyForm Noncommercial 1.0.0** y sus recursos bajo **CC BY-NC-SA 4.0** [S9]. Los recursos originales de Motion Twin también son NC-SA. **No copiar código, sprites, nombres de armas o habilidades, textos ni tablas numéricas tal cual.** Las mecánicas genéricas (iniciativa, esquiva por diferencia de agilidad, tirada de daño con varianza) son patrones de diseño comunes y se pueden reimplementar con valores y nombres propios.
- **Patrones que vale la pena adoptar (diseño propio):**
  1. Simulación **determinista en el servidor**, guardada como estado inicial más una lista de pasos que el cliente reproduce. Ya coincide con el pilar 4 del spec.
  2. Si se quieren combates reproducibles y auditables, usar una **semilla RNG por combate**. Es una mejora sobre el remake, que usa `Math.random`.
  3. **IDs numéricos estables** para acciones y catálogos; nunca renumerarlos.
  4. **Lista de rivales persistida** hasta pelear, para evitar *refresh-scumming*.
  5. **Reinicio perezoso** del límite diario por fecha UTC.
  6. Separar los stats en **base, multiplicador y valor final**, para evitar bugs como el de mascota más vitalidad.
- **Lecciones de riesgo:**
  - La XP por referidos invita al fraude. Si se mantiene, conviene darla por actividad real del invitado y con límites.
  - El puro azar en la creación del personaje empuja al reroll. Conviene equilibrar azar y elección; el árbol binario de V2 fue la respuesta del propio Motion Twin.

---

## 12. Fuentes

| ID | Fuente | Tipo | Notas |
|---|---|---|---|
| S1 | [Wikipedia EN — *My Brute*](https://en.wikipedia.org/wiki/My_Brute) | Enciclopedia | Lleva avisos de fuentes dudosas |
| S2 | [Wikipedia FR — *La Brute (jeu vidéo)*](https://fr.wikipedia.org/wiki/La_Brute_(jeu_vid%C3%A9o)) | Enciclopedia | La mejor para versiones, cierre y tecnología |
| S3 | [MobyGames — My Brute](https://mobygames.com/game/40183/my-brute) | Base de datos | Títulos alternativos |
| S4 | [Blog de K. Dunglas, 18-07-2008 — "Venez défier ma brute"](https://dunglas.dev/2008/07/venez-defier-ma-brute) | Fuente primaria de la época | Fecha temprana y "disciples" |
| S5 | [MyBrute Wiki — Newbie Guide](https://mybrute.fandom.com/wiki/Newbie_Guide) y [Pupil](https://mybrute.fandom.com/wiki/Pupil) | Wiki de fans | Reglas de V1, pupilos, torneos |
| S6 | MyBrute Wiki: [Weapons](https://mybrute.fandom.com/wiki/Weapons), [Pets](https://mybrute.fandom.com/wiki/Pets), [Specialities](https://mybrute.fandom.com/wiki/Specialities), [Level](https://mybrute.fandom.com/wiki/Level), [Experience](https://mybrute.fandom.com/wiki/Experience), [Ranking](https://mybrute.fandom.com/wiki/Ranking), [Tournament](https://mybrute.fandom.com/wiki/Tournament), [Tips and Tricks](https://mybrute.fandom.com/wiki/Tips_and_Tricks) | Wiki de fans | Valores observados empíricamente |
| S7 | [Eternaltwin](https://eternaltwin.org/) y páginas de noticias | Comunidad de preservación | Fechas de cierre |
| S8 | [GitHub — Zenoo/labrute](https://github.com/Zenoo/labrute): `core/src/brute/*.ts`, `core/src/constants.ts`, `server/src/utils/fight/*.ts`, `server/src/controllers/Fights.ts`, `server/src/dailyJob.ts`, `server/prisma/schema.prisma` | Código fuente (remake) | Leído el 2026-11-16 desde la rama `main` |
| S9 | [Zenoo/labrute — `docs/engineering`](https://github.com/Zenoo/labrute/tree/main/docs/engineering) y README | Documentación técnica | Arquitectura, protocolo de combate, licencias |
| S10 | [Eternaltwin — This Month In Eternaltwin #11 (2022-08)](https://eternaltwin.org/docs/tmiet/2022-08) | Noticias | Publicación de código de Motion Twin |
| S11 | [Haxe — History](https://haxe.org/manual/introduction-haxe-history.html) · [Wikipedia — Motion Twin](https://en.wikipedia.org/wiki/Motion_Twin) | Referencia | Origen de Haxe y MTASC en Motion Twin |
| S12 | [GitHub — motion-twin](https://github.com/motion-twin) (Tora, mtypes) · [NekoVM](https://en.wikipedia.org/wiki/NekoVM) | Referencia | Pila de servidor probable (inferencia) |
| S13 | [GitHub — HugoCls/BOT-LaBrute-Muxxu](https://github.com/HugoCls/BOT-LaBrute-Muxxu) | Ingeniería inversa comunitaria | Flujo HTTP, heridas y XP en V2 |
| S14 | [GitLab — eternaltwin/labrute/labrute-original-assets](https://gitlab.com/eternaltwin/labrute/labrute-original-assets) | Archivo | SWF e imágenes originales |
| S15 | [Foro de Eternaltwin — respuesta del desarrollador (16-06-2023)](https://eternaltwin.org/forum/threads/d656cd74-0f42-4af0-ba24-230c0499c575) | Foro | Justificación de 6 u 8 combates por día |

**Fuentes que no se pudieron consultar:** TV Tropes y el hilo de Smashboards devolvieron 403. El wiki *bestbrute.fandom* devolvió 402. Las páginas del wiki *mybrute.fandom* se leyeron a través de la API de MediaWiki.
