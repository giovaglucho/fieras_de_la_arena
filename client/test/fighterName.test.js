import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanFighterName } from '../src/fighterName.js'

test('coincide con la regla del servidor', () => {
  assert.equal(cleanFighterName('  Colmillo   de Bronce '), 'Colmillo de Bronce')
  assert.equal(cleanFighterName('León-2'), 'León-2')
  for (const bad of ['ab', '<b>x</b>', '🔥🔥🔥', 'a'.repeat(19), '-x-', 'Hola!']) {
    assert.equal(cleanFighterName(bad), null, bad)
  }
})
