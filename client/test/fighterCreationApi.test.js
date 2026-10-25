import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFighter } from '../src/api/fighters.js'

const appearance = {
  tone: 'cobre',
  hair: 'cresta',
  clothing: 'chaleco-tejido',
  accessory: 'cinta',
}

test('creates a managed fighter with the selected appearance and idempotency key', async (context) => {
  const previousFetch = globalThis.fetch
  let request
  const fighter = {
    id: 'fighter-id',
    name: 'colmillo',
    level: 1,
    xp: 0,
    elo: 1000,
    baseStats: { health: 100, attack: 10, defense: 4, speed: 5 },
    appearance,
    wins: 0,
    losses: 0,
    draws: 0,
    status: 'active',
    visibility: 'public',
    isActive: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  }

  context.after(() => {
    globalThis.fetch = previousFetch
  })
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return new Response(JSON.stringify({ fighter }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await createFighter('Colmillo', {
    requestId: 'request-123',
    appearance,
  })

  assert.equal(request.url, '/api/v2/fighters')
  assert.deepEqual(JSON.parse(request.options.body), {
    name: 'Colmillo',
    requestId: 'request-123',
    appearance,
  })
  assert.deepEqual(result, fighter)
})

test('rejects a response that does not preserve the requested appearance', async (context) => {
  const previousFetch = globalThis.fetch
  const fighter = {
    id: 'fighter-id',
    name: 'colmillo',
    level: 1,
    xp: 0,
    elo: 1000,
    baseStats: { health: 100, attack: 10, defense: 4, speed: 5 },
    appearance: {
      tone: 'arena',
      hair: 'rapado',
      clothing: 'tunica-cruzada',
      accessory: 'ninguno',
    },
    wins: 0,
    losses: 0,
    draws: 0,
    status: 'active',
    visibility: 'public',
    isActive: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  }

  context.after(() => {
    globalThis.fetch = previousFetch
  })
  globalThis.fetch = async () => new Response(JSON.stringify({ fighter }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })

  await assert.rejects(
    createFighter('Colmillo', { requestId: 'request-123', appearance }),
    /respuesta inesperada/i,
  )
})
