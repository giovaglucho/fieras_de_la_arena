import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { formatBattleEvent } from '../src/battleEvents.js'
import { getBattleEquipmentSummary } from '../src/equipment.js'

const clientRoot = fileURLToPath(new URL('../', import.meta.url))
let vite
let EquipmentCollectionPanel
let BattleEquipment
let fetchActiveFighter
let fetchBattle
let fetchOwnedBattleHistory

before(async () => {
  vite = await createServer({
    root: clientRoot,
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  })
  ;({ EquipmentCollectionPanel } =
    await vite.ssrLoadModule('/src/components/EquipmentCollection.jsx'))
  ;({ default: BattleEquipment } =
    await vite.ssrLoadModule('/src/components/BattleEquipment.jsx'))
  ;({ fetchActiveFighter } = await vite.ssrLoadModule('/src/api/fighters.js'))
  ;({ fetchBattle, fetchOwnedBattleHistory } =
    await vite.ssrLoadModule('/src/api/arena.js'))
})

after(async () => {
  await vite?.close()
})

const weapon = {
  itemId: 'weapon-caliza-01',
  catalogVersion: 'equipment-v1',
  name: 'Aguja de Caliza',
  slot: 'weapon',
  minLevel: 1,
  modifiers: { attack: 1, initiative: 2, piercing: 0, criticalChance: 0 },
}

const armor = {
  itemId: 'armor-yute-01',
  catalogVersion: 'equipment-v1',
  name: 'Manto de Yute',
  slot: 'armor',
  minLevel: 2,
  modifiers: { defense: 1, initiative: 0 },
}

function createFighter(overrides = {}) {
  return {
    id: 'fighter-own',
    name: 'colmillo',
    level: 3,
    xp: 20,
    elo: 1016,
    wins: 1,
    losses: 0,
    draws: 0,
    baseStats: { health: 100, attack: 10, defense: 4, speed: 5 },
    status: 'active',
    visibility: 'public',
    isActive: true,
    createdAt: '2026-10-27T12:00:00.000Z',
    equipment: [weapon, armor],
    equipmentUnlocks: [
      {
        level: 2,
        itemId: armor.itemId,
        catalogVersion: armor.catalogVersion,
        item: armor,
      },
      {
        level: 3,
        itemId: null,
        catalogVersion: 'equipment-v1',
        item: null,
      },
    ],
    ...overrides,
  }
}

function createBattle(ownEquipment = undefined) {
  const ownFighter = {
    id: 'fighter-own',
    name: 'colmillo',
    level: 2,
    elo: 1000,
    stats: { health: 100, attack: 10, defense: 4, speed: 5 },
    ...(ownEquipment === undefined ? {} : { equipment: ownEquipment, initiative: 7 }),
  }
  return {
    id: 'battle-id',
    battleType: 'pvp',
    createdAt: '2026-10-27T12:00:00.000Z',
    winnerFighterId: ownFighter.id,
    ownFighterId: ownFighter.id,
    actionCount: 2,
    engineVersion: 'combat-v2',
    participants: [
      {
        fighter: ownFighter,
        result: { xpGained: 25, eloChange: 16, eloAfter: 1016 },
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
    events: [
      { type: 'combat_started' },
      {
        type: 'attack',
        actionNumber: 1,
        attackerFighterId: ownFighter.id,
        targetFighterId: 'fighter-opponent',
        outcome: 'critical',
      },
      {
        type: 'damage',
        targetFighterId: 'fighter-opponent',
        amount: 20,
        remainingHealth: 80,
      },
      { type: 'combat_finished', winnerFighterId: ownFighter.id },
    ],
  }
}

function mockFetch(context, payload) {
  const previousFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = previousFetch
  })
  globalThis.fetch = async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderCollection(fighter) {
  return renderToStaticMarkup(createElement(EquipmentCollectionPanel, {
    status: 'ready',
    fighter,
    error: '',
    onRetry: () => {},
  }))
}

test('presenta una colección vacía como distinta de una carga histórica', () => {
  const markup = renderCollection(createFighter({
    equipment: [],
    equipmentUnlocks: [],
  }))

  assert.match(markup, /Colección de equipo/)
  assert.match(markup, /No tienes armas todavía/)
  assert.match(markup, /No tienes armaduras todavía/)
  assert.match(markup, /La colección está vacía/)
  assert.doesNotMatch(markup, /Equipo no registrado en este combate/)
  assert.match(markup, /aria-labelledby="equipment-collection-title"/)
  assert.doesNotMatch(markup, /<(button|input|select)\b/)
})

test('muestra objetos, efectos y tiradas de desbloqueo confirmadas', () => {
  const markup = renderCollection(createFighter())

  assert.match(markup, /Aguja de Caliza/)
  assert.match(markup, /Manto de Yute/)
  assert.match(markup, /Ataque/)
  assert.match(markup, /Iniciativa/)
  assert.match(markup, /Desbloqueaste Manto de Yute/)
  assert.match(markup, /Nivel 3/)
  assert.match(markup, /Esta tirada no otorgó un objeto/)
})

test('presenta estados de carga y error con anuncios accesibles y reintento', () => {
  const loadingMarkup = renderToStaticMarkup(createElement(EquipmentCollectionPanel, {
    status: 'loading',
  }))
  const errorMarkup = renderToStaticMarkup(createElement(EquipmentCollectionPanel, {
    status: 'error',
    error: 'El servidor no está disponible.',
    onRetry: () => {},
  }))

  assert.match(loadingMarkup, /role="status"/)
  assert.match(errorMarkup, /role="alert">El servidor no está disponible/)
  assert.match(errorMarkup, /Intentar de nuevo/)
  assert.match(errorMarkup, /<button/)
})

test('distingue la carga sorteada de colecciones y conserva la presentación histórica', () => {
  const loadout = {
    version: 'equipment-loadout-v1',
    catalogVersion: 'equipment-v1',
    weapon: {
      itemId: weapon.itemId,
      catalogVersion: weapon.catalogVersion,
      name: weapon.name,
      slot: weapon.slot,
      modifiers: weapon.modifiers,
    },
    armor: null,
  }
  const battle = createBattle(loadout)
  const markup = renderToStaticMarkup(createElement(BattleEquipment, {
    participants: battle.participants,
  }))
  const legacyMarkup = renderToStaticMarkup(createElement(BattleEquipment, {
    participants: createBattle().participants,
  }))

  assert.match(markup, /Carga sorteada para este combate/)
  assert.match(markup, /Aguja de Caliza/)
  assert.match(markup, /Iniciativa efectiva: 7/)
  assert.match(markup, /Sin armadura en esta carga/)
  assert.match(legacyMarkup, /no conserva el equipo sorteado/)
  assert.match(legacyMarkup, /Este combate histórico se guardó antes/)
  assert.match(getBattleEquipmentSummary(battle.participants[0].fighter), /Aguja de Caliza/)
  assert.match(getBattleEquipmentSummary(createBattle().participants[0].fighter), /no registrado/)

  const critical = formatBattleEvent(battle.events[1], new Map([
    ['fighter-own', 'colmillo'],
    ['fighter-opponent', 'rival'],
  ]))
  assert.match(critical, /golpe crítico/)
  assert.match(critical, /el daño aumenta/)
  assert.match(formatBattleEvent({
    ...battle.events[1],
    outcome: 'misfire',
  }, new Map()), /pifia/)
})

test('valida la colección activa y rechaza objetos mal formados', async (context) => {
  mockFetch(context, { fighter: createFighter() })
  const fighter = await fetchActiveFighter()
  assert.equal(fighter.equipment.length, 2)
  assert.equal(fighter.equipmentUnlocks[0].item.name, armor.name)

  mockFetch(context, {
    fighter: createFighter({
      equipment: [{ ...weapon, modifiers: { attack: '1' } }],
    }),
  })
  await assert.rejects(fetchActiveFighter(), /colección de equipo inesperada/i)
})

test('lee snapshots nuevos y mantiene válidos los combates históricos sin equipo', async (context) => {
  const loadout = {
    version: 'equipment-loadout-v1',
    catalogVersion: 'equipment-v1',
    weapon: {
      itemId: weapon.itemId,
      catalogVersion: weapon.catalogVersion,
      name: weapon.name,
      slot: weapon.slot,
      modifiers: weapon.modifiers,
    },
    armor: null,
  }
  mockFetch(context, { battle: createBattle(loadout) })
  const battle = await fetchBattle('battle-id')
  assert.equal(battle.participants[0].fighter.equipment.weapon.name, weapon.name)

  mockFetch(context, {
    battles: [createBattle(loadout)],
    pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
  })
  const history = await fetchOwnedBattleHistory(1)
  assert.equal(
    history.battles[0].participants[0].fighter.equipment.weapon.name,
    weapon.name
  )

  mockFetch(context, { battle: createBattle() })
  const legacyBattle = await fetchBattle('old-battle')
  assert.equal(legacyBattle.participants[0].fighter.equipment, undefined)
})
