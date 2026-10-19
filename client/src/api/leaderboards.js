const LEADERBOARDS_URL = '/api/v1/leaderboards'
const PAGE_SIZE = 20

async function apiRequest(url) {
  let response

  try {
    response = await fetch(url)
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
    throw new Error(result?.error?.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.')
  }

  return result
}

function readLeaderboard(result, category) {
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
      typeof fighter.username === 'string' &&
      typeof fighter.name === 'string' &&
      Number.isFinite(fighter.level) &&
      Number.isFinite(fighter.elo) &&
      Number.isFinite(fighter.wins) &&
      Number.isFinite(fighter.losses) &&
      Number.isFinite(fighter.draws) &&
      (
        category !== 'students' ||
        (Number.isSafeInteger(fighter.studentsCount) && fighter.studentsCount >= 0)
      )
    )
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return {
    fighters,
    pagination: { page, limit, totalItems, totalPages },
  }
}

export async function fetchLeaderboard(category = 'elo', page = 1) {
  const query = new URLSearchParams({
    category,
    page: String(page),
    limit: String(PAGE_SIZE),
  })

  return readLeaderboard(await apiRequest(`${LEADERBOARDS_URL}?${query}`), category)
}
