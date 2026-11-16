const FALLBACK = 'No se pudo completar la solicitud. Inténtalo de nuevo.'

export function formatWait(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return ''
  }
  if (seconds < 60) {
    return `${Math.ceil(seconds)} s`
  }
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

// Mensaje legible para un error de la API; si el servidor indica cuánto esperar (429), lo añade.
export function apiErrorMessage(result) {
  const message = result?.error?.message || FALLBACK
  const wait = formatWait(result?.error?.retryAfterSeconds)
  return wait ? `${message} Vuelve a intentarlo en ${wait}.` : message
}
