import { isFighterAppearance } from '../fighterAppearance.js'

const ARENA_URL = '/api/v1/arena'
const ARENA_V2_URL = '/api/v2/arena'

async function apiRequest(url, options = {}) {
  let response

  try {
    response = await fetch(url, {
      credentials: 'include',
      ...options,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Comprueba que esté en ejecución e inténtalo de nuevo.')
  }

  let result

  try {
    result = await response.json()
  } catch {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  if (!response.ok) {
    const error = new Error(result?.error?.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.')
    error.code = result?.error?.code
    throw error
  }

  return result
}

function arenaRequest(path, options = {}) {
  return apiRequest(`${ARENA_URL}${path}`, options)
}

function readAttempts(result) {
  const { dateKey, limit, used, remaining } = result ?? {}

  if (
    typeof dateKey !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
    !Number.isSafeInteger(limit) ||
    limit < 0 ||
    !Number.isSafeInteger(used) ||
    used < 0 ||
    !Number.isSafeInteger(remaining) ||
    remaining < 0 ||
    used + remaining !== limit
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return { dateKey, limit, used, remaining }
}

function readBattle(result) {
  const battle = result?.battle
  const hasValidParticipants =
    Array.isArray(battle?.participants) &&
    battle.participants.length === 2 &&
    battle.participants.every(({ fighter, result: participantResult }) =>
      typeof fighter?.id === 'string' &&
      typeof fighter.name === 'string' &&
      Number.isFinite(fighter.level) &&
      Number.isFinite(fighter.elo) &&
      Number.isFinite(participantResult?.xpGained) &&
      Number.isFinite(participantResult?.eloChange) &&
      Number.isFinite(participantResult?.eloAfter)
    )

  if (
    !battle ||
    typeof battle.id !== 'string' ||
    !battle.id ||
    !['pvp', 'training'].includes(battle.battleType) ||
    typeof battle.createdAt !== 'string' ||
    !Number.isSafeInteger(battle.actionCount) ||
    (battle.winnerFighterId !== null && typeof battle.winnerFighterId !== 'string') ||
    !hasValidParticipants ||
    (battle.ownFighterId !== undefined &&
      (typeof battle.ownFighterId !== 'string' ||
        !battle.participants.some(({ fighter }) => fighter.id === battle.ownFighterId))) ||
    !Array.isArray(battle.events) ||
    battle.events.length === 0 ||
    !battle.events.every((event) => event && typeof event.type === 'string')
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return battle
}

function readBattleSummary(battle) {
  const hasValidParticipants =
    Array.isArray(battle?.participants) &&
    battle.participants.length === 2 &&
    battle.participants.every(({ fighter, result }) =>
      typeof fighter?.id === 'string' &&
      typeof fighter.name === 'string' &&
      Number.isFinite(fighter.level) &&
      Number.isFinite(fighter.elo) &&
      Number.isFinite(result?.xpGained) &&
      Number.isFinite(result?.eloChange) &&
      Number.isFinite(result?.eloAfter)
    )

  if (
    !battle ||
    typeof battle.id !== 'string' ||
    !battle.id ||
    !['pvp', 'training'].includes(battle.battleType) ||
    typeof battle.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(battle.createdAt)) ||
    !Number.isSafeInteger(battle.actionCount) ||
    (battle.winnerFighterId !== null && typeof battle.winnerFighterId !== 'string') ||
    typeof battle.engineVersion !== 'string' ||
    !hasValidParticipants
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return battle
}

function readBattleHistory(result) {
  const { battles, pagination } = result ?? {}
  const { page, limit, totalItems, totalPages } = pagination ?? {}

  if (
    !Array.isArray(battles) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(totalItems) ||
    totalItems < 0 ||
    !Number.isSafeInteger(totalPages) ||
    totalPages !== Math.ceil(totalItems / limit) ||
    battles.length > limit
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return {
    battles: battles.map(readBattleSummary),
    pagination: { page, limit, totalItems, totalPages },
  }
}

function readChallengeAttempts(result) {
  if (typeof result?.fighterId !== 'string' || !result.fighterId) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return { fighterId: result.fighterId, ...readAttempts(result) }
}

function readOpponentList(result) {
  const { fighters, pagination } = result ?? {}
  const { page, limit, totalItems, totalPages } = pagination ?? {}

  if (
    !Array.isArray(fighters) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(totalItems) ||
    totalItems < 0 ||
    !Number.isSafeInteger(totalPages) ||
    totalPages !== Math.ceil(totalItems / limit) ||
    fighters.length > limit ||
    !fighters.every((fighter) =>
      typeof fighter?.id === 'string' &&
      typeof fighter.name === 'string' &&
      typeof fighter.username === 'string' &&
      Number.isSafeInteger(fighter.level) &&
      fighter.level >= 1 &&
      Number.isFinite(fighter.elo) &&
      Number.isSafeInteger(fighter.wins) &&
      Number.isSafeInteger(fighter.losses) &&
      Number.isSafeInteger(fighter.draws) &&
      isFighterAppearance(fighter.appearance)
    )
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return {
    fighters,
    pagination: { page, limit, totalItems, totalPages },
  }
}

function readOwnedBattleHistory(result) {
  const history = readBattleHistory(result)
  const battles = history.battles.map((battle, index) => {
    const ownFighterId = result.battles[index]?.ownFighterId

    if (
      typeof ownFighterId !== 'string' ||
      !battle.participants.some(({ fighter }) => fighter.id === ownFighterId)
    ) {
      throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
    }

    return { ...battle, ownFighterId }
  })

  return { ...history, battles }
}

export async function fetchArenaAttempts() {
  return readAttempts(await arenaRequest('/attempts'))
}

export async function fetchArenaChallengeAttempts() {
  return readChallengeAttempts(await apiRequest(`${ARENA_V2_URL}/attempts`))
}

export async function fetchArenaOpponents({ page = 1, limit = 20, q, minLevel, maxLevel } = {}) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })

  if (q) {
    query.set('q', q)
  }
  if (minLevel) {
    query.set('minLevel', String(minLevel))
  }
  if (maxLevel) {
    query.set('maxLevel', String(maxLevel))
  }

  return readOpponentList(await apiRequest(`${ARENA_V2_URL}/opponents?${query}`))
}

export async function fetchBattleHistory(page = 1, limit = 20) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  return readBattleHistory(await arenaRequest(`/history?${query}`))
}

export async function fetchOwnedBattleHistory(page = 1, limit = 20) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  return readOwnedBattleHistory(await apiRequest(`${ARENA_V2_URL}/history?${query}`))
}

export async function startArenaFight(requestId) {
  const result = await arenaRequest('/fight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId }),
  })

  return readBattle(result)
}

export async function startDirectedChallenge(fighterId, opponentFighterId, requestId) {
  const result = await apiRequest(`${ARENA_V2_URL}/challenges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fighterId, opponentFighterId, requestId }),
  })
  const battle = readBattle(result)

  if (
    battle.ownFighterId !== fighterId ||
    !battle.participants.some(({ fighter }) => fighter.id === fighterId) ||
    !battle.participants.some(({ fighter }) => fighter.id === opponentFighterId)
  ) {
    throw new Error('El servidor devolvió un resultado distinto al desafío confirmado.')
  }

  return battle
}

export async function fetchBattle(battleId) {
  return readBattle(await apiRequest(`/api/v1/battles/${encodeURIComponent(battleId)}`))
}
