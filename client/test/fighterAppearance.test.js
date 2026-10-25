import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FIGHTER_APPEARANCE_OPTIONS,
  NEUTRAL_FIGHTER_APPEARANCE,
  isFighterAppearance,
} from '../src/fighterAppearance.js'

test('exposes only the approved cosmetic options and accepts the neutral appearance', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(FIGHTER_APPEARANCE_OPTIONS).map(([field, options]) => [
        field,
        options.map(({ value }) => value),
      ]),
    ),
    {
      tone: ['arena', 'arcilla', 'cobre', 'pizarra', 'marfil'],
      hair: ['rapado', 'corto', 'trenzas', 'melena', 'cresta'],
      clothing: ['tunica-cruzada', 'manto-corto', 'faldon-tejido', 'chaleco-tejido'],
      accessory: ['ninguno', 'cinta', 'collar-cuentas', 'brazaletes', 'pendientes'],
    },
  )
  assert.equal(isFighterAppearance(NEUTRAL_FIGHTER_APPEARANCE), true)
})

test('rejects unsupported values and incomplete or extended appearance payloads', () => {
  assert.equal(isFighterAppearance({ ...NEUTRAL_FIGHTER_APPEARANCE, tone: 'violeta' }), false)
  assert.equal(isFighterAppearance({ tone: 'arena' }), false)
  assert.equal(isFighterAppearance({ ...NEUTRAL_FIGHTER_APPEARANCE, extra: 'value' }), false)
})
