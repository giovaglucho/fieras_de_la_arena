import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  fetchArenaChallengeAttempts,
  fetchOwnedBattleHistory,
} from '../src/api/arena.js'

test('carga intentos del luchador activo usando la API v2', async (context) => {
  const previousFetch = globalThis.fetch
  let requestUrl
  context.after(() => {
    globalThis.fetch = previousFetch
  })
  globalThis.fetch = async (url) => {
    requestUrl = url
    return new Response(JSON.stringify({
      fighterId: 'fighter-active',
      dateKey: '2026-11-15',
      limit: 5,
      used: 2,
      remaining: 3,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const attempts = await fetchArenaChallengeAttempts()

  assert.equal(requestUrl, '/api/v2/arena/attempts')
  assert.deepEqual(attempts, {
    fighterId: 'fighter-active',
    dateKey: '2026-11-15',
    limit: 5,
    used: 2,
    remaining: 3,
  })
})

test('solicita historial v2 filtrado por luchador activo', async (context) => {
  const previousFetch = globalThis.fetch
  let requestUrl
  context.after(() => {
    globalThis.fetch = previousFetch
  })
  globalThis.fetch = async (url) => {
    requestUrl = url
    return new Response(JSON.stringify({
      battles: [],
      pagination: { page: 1, limit: 5, totalItems: 0, totalPages: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const history = await fetchOwnedBattleHistory(1, 5, 'fighter-active')

  assert.equal(
    requestUrl,
    '/api/v2/arena/history?page=1&limit=5&fighterId=fighter-active',
  )
  assert.deepEqual(history, {
    battles: [],
    pagination: { page: 1, limit: 5, totalItems: 0, totalPages: 0 },
  })
})
