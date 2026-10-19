const FIGHTERS_URL = '/api/v1/fighters'
const PROFILES_URL = '/api/v1/profiles'

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

function fighterRequest(path, options = {}) {
  return apiRequest(`${FIGHTERS_URL}${path}`, options)
}

function readFighter(result) {
  const fighter = result?.fighter

  if (fighter === null) {
    return null
  }

  if (
    !fighter ||
    typeof fighter.id !== 'string' ||
    typeof fighter.name !== 'string'
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return fighter
}

function readFighterProfile(result) {
  const fighter = result?.fighter
  const stats = fighter?.baseStats
  const hasValidStats = stats &&
    ['health', 'attack', 'defense', 'speed'].every((key) => Number.isFinite(stats[key]))

  if (
    !fighter ||
    typeof fighter.id !== 'string' ||
    typeof fighter.username !== 'string' ||
    typeof fighter.name !== 'string' ||
    !Number.isFinite(fighter.level) ||
    !Number.isFinite(fighter.xp) ||
    !Number.isFinite(fighter.elo) ||
    !Number.isFinite(fighter.wins) ||
    !Number.isFinite(fighter.losses) ||
    !Number.isFinite(fighter.draws) ||
    !hasValidStats
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return fighter
}

export async function fetchMyFighter() {
  const result = await fighterRequest('/me')

  if (result?.fighter === null) {
    return null
  }

  const fighter = readFighterProfile(result)
  const stats = fighter.stats
  const hasValidStats = stats &&
    ['health', 'attack', 'defense', 'speed'].every((key) => Number.isFinite(stats[key]))

  if (!hasValidStats || !Number.isSafeInteger(fighter.xpToNextLevel) || fighter.xpToNextLevel < 1) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return fighter
}

export async function fetchPublicProfile(username) {
  const result = await apiRequest(`${PROFILES_URL}/${encodeURIComponent(username)}`)

  return readFighterProfile(result)
}

export async function createFighter(name) {
  const fighter = readFighter(await fighterRequest('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }))

  if (!fighter) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return fighter
}
