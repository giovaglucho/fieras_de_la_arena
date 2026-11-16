import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiErrorMessage, formatWait } from '../src/api/errorMessage.js'

test('formatWait presenta segundos, minutos y horas', () => {
  assert.equal(formatWait(5), '5 s')
  assert.equal(formatWait(61), '2 min')
  assert.equal(formatWait(3600), '1 h')
  assert.equal(formatWait(5400), '1 h 30 min')
  assert.equal(formatWait(undefined), '')
  assert.equal(formatWait(0), '')
})

test('apiErrorMessage añade el tiempo de espera de un 429 y respeta mensajes normales', () => {
  assert.equal(
    apiErrorMessage({ error: { message: 'Demasiadas solicitudes.', retryAfterSeconds: 30 } }),
    'Demasiadas solicitudes. Vuelve a intentarlo en 30 s.'
  )
  assert.equal(apiErrorMessage({ error: { message: 'Otro error.' } }), 'Otro error.')
  assert.equal(apiErrorMessage(null), 'No se pudo completar la solicitud. Inténtalo de nuevo.')
})
