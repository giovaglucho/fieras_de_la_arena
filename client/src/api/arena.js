const ARENA_URL = '/api/v1/arena'

async function arenaRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${ARENA_URL}${path}`, {
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

export async function fetchArenaAttempts() {
  return readAttempts(await arenaRequest('/attempts'))
}

export async function startArenaFight(requestId) {
  const result = await arenaRequest('/fight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId }),
  })
  const battle = result?.battle

  if (!battle || typeof battle.id !== 'string' || !battle.id) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return battle
}
