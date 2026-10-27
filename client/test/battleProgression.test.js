import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { fetchBattle } from '../src/api/arena.js'

const clientRoot = fileURLToPath(new URL('../', import.meta.url))
let vite
let BattleProgression
let BattleResultError

before(async () => {
  vite = await createServer({
    root: clientRoot,
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  })
  ;({ default: BattleProgression, BattleResultError } =
    await vite.ssrLoadModule('/src/components/BattleProgression.jsx'))
})

after(async () => {
  await vite?.close()
})

function createProgression(levelsGained = 1) {
  const growthEvents = Array.from({ length: levelsGained }, (_, index) => ({
    level: index + 2,
    stat: ['attack', 'health', 'speed'][index] ?? 'defense',
    amount: 1,
  }))

  return {
    levelBefore: 1,
    levelAfter: 1 + levelsGained,
    xpBefore: 95,
    xpAfter: levelsGained === 0 ? 20 : 10,
    levelsGained,
    statsBefore: { health: 100, attack: 10, defense: 4, speed: 5 },
    statsAfter: {
      health: 100 + (growthEvents.some(({ stat }) => stat === 'health') ? 1 : 0),
      attack: 10 + (growthEvents.some(({ stat }) => stat === 'attack') ? 1 : 0),
      defense: 4 + (growthEvents.some(({ stat }) => stat === 'defense') ? 1 : 0),
      speed: 5 + (growthEvents.some(({ stat }) => stat === 'speed') ? 1 : 0),
    },
    growthEvents,
  }
}

function createBattle(progression) {
  const fighter = {
    id: 'fighter-own',
    name: 'colmillo',
    level: progression.levelBefore,
    elo: 1000,
    stats: progression.statsBefore,
  }
  return {
    id: 'battle-id',
    battleType: 'pvp',
    createdAt: '2026-10-27T12:00:00.000Z',
    winnerFighterId: fighter.id,
    ownFighterId: fighter.id,
    actionCount: 2,
    engineVersion: 'combat-v1',
    participants: [
      {
        fighter,
        result: { xpGained: 25, eloChange: 16, eloAfter: 1016, progression },
      },
      {
        fighter: {
          id: 'fighter-opponent',
          name: 'rival',
          level: 1,
          elo: 1000,
          stats: { health: 100, attack: 10, defense: 4, speed: 5 },
        },
        result: { xpGained: 10, eloChange: -16, eloAfter: 984 },
      },
    ],
    events: [{ type: 'combat_finished' }],
  }
}

function mockFetch(context, response) {
  const previousFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = previousFetch
  })
  globalThis.fetch = async () => response
}

test('valida y renderiza los aumentos de varios niveles con los datos del servidor', async (context) => {
  const progression = createProgression(3)
  mockFetch(context, new Response(JSON.stringify({ battle: createBattle(progression) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))

  const battle = await fetchBattle('battle-id')
  const ownParticipant = battle.participants[0]
  const markup = renderToStaticMarkup(createElement(BattleProgression, {
    progression: ownParticipant.result.progression,
    xpGained: ownParticipant.result.xpGained,
  }))

  assert.match(markup, /El servidor otorgó \+25 XP/)
  assert.match(markup, /Subiste 3 niveles/)
  assert.match(markup, /Nivel 2: \+1 Ataque/)
  assert.match(markup, /Nivel 3: \+1 Vida/)
  assert.match(markup, /Nivel 4: \+1 Velocidad/)
  assert.match(markup, /<td>10<\/td>/)
  assert.match(markup, /<td>11<span class="battle-progression__increase"> · Aumentó<\/span><\/td>/)
})

test('muestra progreso sin aumento y el estado de datos históricos ausentes', () => {
  const progression = createProgression(0)
  const markup = renderToStaticMarkup(createElement(BattleProgression, {
    progression,
    xpGained: 25,
  }))
  const legacyMarkup = renderToStaticMarkup(createElement(BattleProgression, {
    progression: null,
    xpGained: 10,
  }))

  assert.match(markup, /No alcanzaste el siguiente nivel/)
  assert.match(markup, /No hubo mejoras de atributos/)
  assert.match(legacyMarkup, /no incluye datos de progresión guardados por el servidor/)
})

test('rechaza progreso mal formado y presenta errores de carga al usuario', async (context) => {
  const invalidProgression = {
    ...createProgression(2),
    growthEvents: [{ level: 2, stat: 'attack', amount: 1 }],
  }
  mockFetch(context, new Response(JSON.stringify({ battle: createBattle(invalidProgression) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))

  await assert.rejects(fetchBattle('battle-id'), /respuesta inesperada/i)

  const errorMarkup = renderToStaticMarkup(createElement(BattleResultError, {
    error: 'El servidor no está disponible.',
    onRetry: () => {},
  }))
  assert.match(errorMarkup, /No se pudo cargar el combate/)
  assert.match(errorMarkup, /role="alert">El servidor no está disponible/)
  assert.match(errorMarkup, /Intentar de nuevo/)
})
