async function authRequest(path, options = {}, allowUnauthenticated = false) {
  let response

  try {
    response = await fetch(`/api/v1/auth/${path}`, {
      credentials: 'include',
      ...options,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Comprueba que esté en ejecución e inténtalo de nuevo.')
  }

  if (allowUnauthenticated && response.status === 401) {
    return null
  }

  if (response.status === 204) {
    return null
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

function readUser(result) {
  const user = result?.user

  if (
    !user ||
    typeof user.id !== 'string' ||
    typeof user.username !== 'string' ||
    typeof user.email !== 'string'
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return user
}

export async function registerUser(values) {
  const result = await authRequest('register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })

  return readUser(result)
}

export async function loginUser(values) {
  const result = await authRequest('login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })

  return readUser(result)
}

export async function fetchSession() {
  const result = await authRequest('me', {}, true)

  return result ? readUser(result) : null
}

export async function logoutUser() {
  await authRequest('logout', { method: 'POST' })
}
