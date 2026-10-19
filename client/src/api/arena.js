const ARENA_URL = '/api/v1/arena'

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
    !Array.isArray(battle.events) ||
    battle.events.length === 0 ||
    !battle.events.every((event) => event && typeof event.type === 'string')
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return battle
}

export async function fetchArenaAttempts() {
  return readAttempts(await arenaRequest('/attempts'))
}

export async function startArenaFight(requestId) {
  const result = await arenaRequest('/fight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId }),
  })

  return readBattle(result)
}

export async function fetchBattle(battleId) {
  return readBattle(await apiRequest(`/api/v1/battles/${encodeURIComponent(battleId)}`))
}
