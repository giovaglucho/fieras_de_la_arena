const FIGHTERS_URL = '/api/v1/fighters'

async function fighterRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${FIGHTERS_URL}${path}`, {
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

export async function fetchMyFighter() {
  return readFighter(await fighterRequest('/me'))
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
